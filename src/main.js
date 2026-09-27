import './style.css';
import './checkout.css';
import './admin-management.css';
import { supabase, supabaseConfigured } from './supabase.js';

const defaultProducts = [
  { id: 'rose-serum', name: 'Rose Renewal Serum', type: 'Skincare', price: 2490, originalPrice: 3890, rating: 4.9, reviews: 42, shade: 'rose', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=85' },
  { id: 'silk-foundation', name: 'Silk Veil Foundation', type: 'Makeup', price: 1890, originalPrice: 2700, rating: 4.8, reviews: 29, shade: 'sand', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=85' },
  { id: 'gold-elixir', name: 'Golden Glow Elixir', type: 'Skincare', price: 2790, originalPrice: 4200, rating: 4.9, reviews: 58, shade: 'gold', image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=700&q=85' },
  { id: 'velvet-lip', name: 'Velvet Petal Lip Color', type: 'Makeup', price: 1290, originalPrice: 1990, rating: 4.9, reviews: 88, shade: 'berry', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=85' },
  { id: 'midnight-musk', name: 'Midnight Musk Eau de Parfum', type: 'Fragrance', price: 3490, originalPrice: 4990, rating: 5.0, reviews: 19, shade: 'ink', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=85' },
  { id: 'botanical-wash', name: 'Botanical Cleansing Balm', type: 'Bath & Body', price: 1590, originalPrice: 2250, rating: 4.8, reviews: 33, shade: 'leaf', image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=700&q=85' }
];

let products = JSON.parse(localStorage.getItem('classic-products') || 'null') || defaultProducts;

let cart = JSON.parse(localStorage.getItem('classic-cart') || '[]');
let liveOrders = [];
let ordersLoaded = false;
let ordersChannel = null;
let ordersPoller = null;
let catalogueChannel = null;
let activeCategory = 'all';
let searchQuery = '';
let promoSlideIndex = 0;
let promoTimer = null;

const money = value => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
const save = () => localStorage.setItem('classic-cart', JSON.stringify(cart));
const cartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
const cartTotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

const defaultCategoryImages = {
  'skincare': 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=300&q=80',
  'makeup': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=300&q=80',
  'fragrance': 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=300&q=80',
  'bath & body': 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=300&q=80',
  'haircare': 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=300&q=80',
  'k beauty': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80'
};

function getCategoryImage(categoryName) {
  const key = (categoryName || '').toLowerCase().trim();
  if (defaultCategoryImages[key]) return defaultCategoryImages[key];
  const prod = products.find(p => (p.type || '').toLowerCase() === key && p.image);
  if (prod) return prod.image;
  return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80';
}

function getDiscountPercentage(product) {
  const orig = Number(product.originalPrice || product.compare_at_price || 0);
  const price = Number(product.price);
  if (orig && orig > price) {
    return Math.round(((orig - price) / orig) * 100);
  }
  return 0;
}

function productCard(product) {
  const discount = getDiscountPercentage(product);
  const origPrice = Number(product.originalPrice || product.compare_at_price || 0);
  const rating = product.rating || 4.8;
  const reviews = product.reviews || 28;

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-image-container">
        ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
        <button class="product-image-btn" data-details="${product.id}" aria-label="View ${product.name}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
        </button>
        <button class="quick-add-fab" data-add="${product.id}" aria-label="Add ${product.name} to cart" title="Add to bag">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z"/>
          </svg>
        </button>
      </div>
      <div class="product-card-body">
        <span class="product-category-tag">${product.type}</span>
        <h3 class="product-name-heading" data-details="${product.id}" title="${product.name}">${product.name}</h3>
        <div class="product-rating-row">
          <span class="stars-gold">★★★★★</span>
          <span class="review-count">(${reviews})</span>
        </div>
        <div class="product-price-row">
          ${origPrice && origPrice > product.price ? `<del class="cut-price">${money(origPrice)}</del>` : ''}
          <strong class="sale-price">${money(Number(product.price))}</strong>
        </div>
      </div>
    </article>
  `;
}

function getFilteredProducts() {
  let list = products;
  if (activeCategory !== 'all') {
    list = list.filter(p => (p.type || '').toLowerCase() === activeCategory.toLowerCase());
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function updateProductGrid() {
  const grid = document.querySelector('#products-grid');
  const title = document.querySelector('#shop-title');
  const count = document.querySelector('#product-count');
  if (!grid) return;

  const filtered = getFilteredProducts();
  
  if (title) {
    if (searchQuery.trim()) {
      title.textContent = `Search: "${searchQuery}"`;
    } else {
      title.textContent = activeCategory === 'all' ? 'Best Sellers' : activeCategory;
    }
  }

  if (count) {
    count.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length) {
    grid.className = 'products';
    grid.innerHTML = filtered.map(productCard).join('');
    grid.querySelectorAll('[data-add]').forEach(button => button.onclick = () => add(button.dataset.add));
    grid.querySelectorAll('[data-details]').forEach(button => button.onclick = () => showProductDetails(button.dataset.details));
  } else {
    grid.className = 'products products-empty';
    grid.innerHTML = `
      <div class="empty-search-state">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Aapki search "${searchQuery}" ke mutabiq koi product nahi mila.</p>
        <button class="button reset-search-btn" id="reset-search-btn">View All Products <span>→</span></button>
      </div>
    `;
    const resetBtn = grid.querySelector('#reset-search-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        searchQuery = '';
        activeCategory = 'all';
        const searchInput = document.querySelector('#mobile-search-input');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.category-circle-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
        updateProductGrid();
      };
    }
  }
}

function setupPromoCarousel() {
  const track = document.querySelector('#promo-track');
  const dots = document.querySelectorAll('.promo-dot');
  if (!track || !dots.length) return;

  function goToSlide(index) {
    promoSlideIndex = (index + 3) % 3;
    track.style.transform = `translateX(-${promoSlideIndex * 33.333}%)`;
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === promoSlideIndex));
  }

  dots.forEach(dot => {
    dot.onclick = () => {
      goToSlide(Number(dot.dataset.slide));
      resetTimer();
    };
  });

  function resetTimer() {
    if (promoTimer) clearInterval(promoTimer);
    promoTimer = setInterval(() => {
      goToSlide(promoSlideIndex + 1);
    }, 4500);
  }
  resetTimer();

  let startX = 0;
  track.parentElement?.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  track.parentElement?.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToSlide(promoSlideIndex + 1);
      else goToSlide(promoSlideIndex - 1);
      resetTimer();
    }
  }, { passive: true });
}

function render() {
  const displayedProducts = getFilteredProducts();

  document.querySelector('#app').innerHTML = `
    <div class="announcement">
      <span>✦ 100% Genuine Products</span>
      <span class="desktop-only">Free delivery across Pakistan</span>
      <span class="desktop-only">Easy cash on delivery</span>
    </div>

    <!-- 1. Top par: Logo header -->
    <header>
      <button class="menu-button" aria-label="Open navigation">☰</button>
      <a class="logo" href="#top">
        <span>CLASSIC</span><em>cosmetics</em>
      </a>
      <nav class="desktop-only">
        <a href="#shop">Shop</a>
        ${categories.map(category=>`<a href="#shop" data-category-link="${category}">${category}</a>`).join('')}
        <a href="#contact">Contact</a>
      </nav>
      <div class="header-actions">
        <button class="desktop-only" aria-label="Search">⌕</button>
        <button class="desktop-only" aria-label="Account">♙</button>
        <button class="cart-trigger" aria-label="Open cart">
          <svg class="bag-svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 01-8 0"></path>
          </svg>
          <b>${cartCount()}</b>
        </button>
      </div>
    </header>

    <aside class="mobile-menu">
      <button class="close-menu" aria-label="Close menu">×</button>
      <p class="eyebrow">Explore</p>
      <a href="#shop">Shop all</a>
      ${categories.map(category=>`<a href="#shop" data-category-link="${category}">${category}</a>`).join('')}
      <a href="#story">Our story</a>
      <a href="#contact">Contact</a>
    </aside>

    <main id="top">
      <!-- DESKTOP HERO & SECTIONS (Only visible on desktop > 760px, untouched) -->
      <div class="desktop-store-flow">
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">The art of everyday beauty</p>
            <h1>Radiance, made<br /><i>ritual.</i></h1>
            <p class="hero-text">Considered essentials for your most luminous self. Discover beauty that feels like care.</p>
            <a class="button" href="#shop">Shop the collection <span>→</span></a>
          </div>
          <div class="hero-art">
            <div class="sun"></div>
            <div class="arch"></div>
            <img src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=90" alt="Classic beauty collection" />
            <p class="vertical-label">EST. 2024 · PAKISTAN</p>
          </div>
        </section>
        <section class="trust">
          <div><b>✦</b><span><strong>Curated with care</strong>Authentic beauty, thoughtfully chosen</span></div>
          <div><b>◌</b><span><strong>Made for you</strong>Every tone. Every ritual. Every day.</span></div>
          <div><b>⌁</b><span><strong>Delivered beautifully</strong>Across Pakistan, at your doorstep</span></div>
        </section>
        <section class="categories" id="rituals">
          <div class="section-heading"><p class="eyebrow">Explore by ritual</p><h2>Beauty, your way</h2></div>
          <div class="category-grid">${categories.map((category,index)=>`<a href="#shop" data-category-link="${category}"><span class="cat-number">${String(index+1).padStart(2,'0')}</span><strong>${category}</strong><i>Discover the collection</i></a>`).join('')}</div>
        </section>
      </div>

      <!-- MOBILE HIGHFY-STYLE FLOW (Only visible on mobile <= 760px) -->
      <div class="mobile-highfy-flow">
        <!-- 2. Uske foran neeche: Search bar -->
        <div class="mobile-search-section">
          <div class="mobile-search-bar">
            <svg class="search-input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="search" 
              id="mobile-search-input" 
              placeholder="Search for products, brands..." 
              value="${searchQuery}" 
              autocomplete="off" 
              aria-label="Search products"
            />
            ${searchQuery ? `<button class="clear-search-btn" id="clear-search-btn" aria-label="Clear search">×</button>` : ''}
          </div>
        </div>

        <!-- 3. Uske neeche: Category icons row (Circular Horizontal Scrollable) -->
        <section class="mobile-category-row" aria-label="Categories">
          <div class="mobile-category-scroll">
            <button class="category-circle-btn ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
              <div class="category-circle-img-wrap all-wrap">
                <span>✦</span>
              </div>
              <span class="category-circle-label">All</span>
            </button>
            ${categories.map(category => `
              <button class="category-circle-btn ${activeCategory.toLowerCase() === category.toLowerCase() ? 'active' : ''}" data-cat="${category}">
                <div class="category-circle-img-wrap">
                  <img src="${getCategoryImage(category)}" alt="${category}" loading="lazy" />
                </div>
                <span class="category-circle-label">${category}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- 4. Uske neeche: Promotional banner carousel (Swipeable with dots) -->
        <section class="mobile-promo-carousel" aria-label="Special Offers">
          <div class="promo-carousel-container">
            <div class="promo-slides-track" id="promo-track">
              <div class="promo-banner-card banner-theme-gold">
                <div class="promo-inner">
                  <span class="promo-tag">LIMITED TIME OFFER</span>
                  <h3>FLAT 25% OFF</h3>
                  <p>Everyday Radiance & Luxury Skincare Rituals</p>
                  <a href="#shop" class="promo-cta-btn">Shop Sale →</a>
                </div>
              </div>
              <div class="promo-banner-card banner-theme-rose">
                <div class="promo-inner">
                  <span class="promo-tag">FREE DELIVERY</span>
                  <h3>Cash on Delivery</h3>
                  <p>Inspect Parcel on Delivery · Anywhere in Pakistan</p>
                  <a href="#shop" class="promo-cta-btn">Order Now →</a>
                </div>
              </div>
              <div class="promo-banner-card banner-theme-dark">
                <div class="promo-inner">
                  <span class="promo-tag">VERIFIED AUTHENTIC</span>
                  <h3>100% Genuine Beauty</h3>
                  <p>Carefully formulated essentials for luminous skin</p>
                  <a href="#shop" class="promo-cta-btn">Discover →</a>
                </div>
              </div>
            </div>
          </div>
          <div class="promo-dots" id="promo-dots">
            <button class="promo-dot active" data-slide="0" aria-label="Slide 1"></button>
            <button class="promo-dot" data-slide="1" aria-label="Slide 2"></button>
            <button class="promo-dot" data-slide="2" aria-label="Slide 3"></button>
          </div>
        </section>
      </div>

      <!-- 5. Uske neeche: Products seedhe 2-column grid mein -->
      <section class="featured" id="shop">
        <div class="section-heading row-heading shop-header-bar">
          <div>
            <p class="eyebrow">${searchQuery ? 'Search Results' : 'Best Sellers'}</p>
            <h2 id="shop-title">${searchQuery ? `Search: "${searchQuery}"` : (activeCategory === 'all' ? 'Best Sellers' : activeCategory)}</h2>
          </div>
          <div class="shop-filter-meta">
            <span class="product-counter" id="product-count">${displayedProducts.length} product${displayedProducts.length === 1 ? '' : 's'}</span>
            <button class="text-link desktop-only" id="view-all">View all products →</button>
          </div>
        </div>

        <div class="shop-filter-bar desktop-only" role="tablist" aria-label="Categories">
          <button class="filter-pill ${activeCategory === 'all' ? 'active' : ''}" data-filter="all">All Products</button>
          ${categories.map(cat => `<button class="filter-pill ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" data-filter="${cat}">${cat}</button>`).join('')}
        </div>

        <div class="products ${displayedProducts.length === 0 ? 'products-empty' : ''}" id="products-grid">
          ${displayedProducts.length > 0 
            ? displayedProducts.map(productCard).join('') 
            : `<div class="empty-search-state">
                 <div class="empty-icon">🔍</div>
                 <h3>No products found</h3>
                 <p>Aapki search "${searchQuery}" ke mutabiq koi product nahi mila.</p>
                 <button class="button reset-search-btn" id="reset-search-btn">View All Products <span>→</span></button>
               </div>`
          }
        </div>
      </section>

      <section class="editorial" id="story">
        <div class="editorial-image"><img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=90" alt="Woman applying skincare" /></div>
        <div class="editorial-copy">
          <p class="eyebrow">Our philosophy</p>
          <h2>Beauty should feel<br /><i>like a pause.</i></h2>
          <p>We believe the small moments you give yourself matter most. Classic Cosmetics brings together refined, effective beauty to turn the everyday into a personal ritual.</p>
          <a class="text-link" href="#contact">Meet Classic Cosmetics →</a>
        </div>
      </section>

      <section class="reviews">
        <p class="eyebrow">Kind words</p>
        <blockquote>“The packaging, the products, the whole experience — it feels like a little luxury delivered to my door.”</blockquote>
        <div class="stars">★★★★★</div>
        <p>— AREEBA K., LAHORE</p>
      </section>

      <section class="newsletter" id="contact">
        <div>
          <p class="eyebrow">A note from us</p>
          <h2>Be first to know</h2>
          <p>New arrivals, quiet offers and beauty notes — just the lovely bits.</p>
        </div>
        <form id="newsletter-form">
          <input type="email" required placeholder="Your email address" aria-label="Email address" />
          <button class="button" type="submit">Subscribe <span>→</span></button>
        </form>
      </section>
    </main>

    <footer>
      <a class="logo" href="#top"><span>CLASSIC</span><em>cosmetics</em></a>
      <div><strong>Explore</strong><a href="#shop">Shop all</a><a href="#rituals">Collections</a><a href="#story">Our story</a></div>
      <div><strong>Customer care</strong><a href="#contact">Contact us</a><a href="#">Delivery & returns</a><a href="#">Privacy policy</a></div>
      <p>© 2026 Classic Cosmetics.<br />Elegance in every detail.</p>
    </footer>

    <a class="whatsapp" href="https://wa.me/923222495034?text=Hi%2C%20I%20have%20a%20question%20about%20a%20product" target="_blank" rel="noopener noreferrer" aria-label="Chat with Classic Cosmetics on WhatsApp">◔</a>
    
    <aside class="cart-panel ${cart.length ? 'open' : ''}">
      <div class="cart-head"><h2>Your bag</h2><button class="close-cart" aria-label="Close cart">×</button></div>
      ${cart.length ? `
        <div class="cart-items">
          ${cart.map(item => `
            <div class="cart-item">
              <img src="${item.image}" alt="" />
              <div>
                <span>${item.type}</span>
                <strong>${item.name}</strong>
                <small>${money(item.price)} × ${item.quantity}</small>
              </div>
              <button data-remove="${item.id}" aria-label="Remove ${item.name}">×</button>
            </div>
          `).join('')}
        </div>
        <div class="cart-footer">
          <p><span>Subtotal</span><strong>${money(cartTotal())}</strong></p>
          <button class="button checkout">Secure checkout <span>→</span></button>
          <small>Cash on delivery available</small>
        </div>
      ` : `
        <div class="empty-cart">
          <p>Your bag is waiting for a little beauty.</p>
          <button class="button close-cart">Continue shopping</button>
        </div>
      `}
    </aside>

    <div class="checkout-modal" aria-hidden="true">
      <div class="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <button class="close-checkout" aria-label="Close checkout">×</button>
        <div class="checkout-header">
          <p class="eyebrow">Fast & Secure</p>
          <h2 id="checkout-title">Delivery Details</h2>
          <p class="checkout-tagline">Apni delivery details enter karein aur Cash on Delivery par order confirm karein.</p>
        </div>
        <div class="checkout-summary-bar">
          <div class="summary-left">
            <span>Items: <b>${cartCount()}</b></span>
            <span class="free-ship-badge">🚚 Free Delivery</span>
          </div>
          <div class="summary-right">
            <span>Total: <strong>${money(cartTotal())}</strong></span>
          </div>
        </div>
        <form id="checkout-form">
          <div class="form-group">
            <label for="checkout-name">Full Name <span class="req">*</span></label>
            <input id="checkout-name" name="name" required autocomplete="name" placeholder="Apna poora naam likhein (e.g. Areeba Khan)" />
          </div>
          <div class="form-group">
            <label for="checkout-phone">WhatsApp / Mobile Number <span class="req">*</span></label>
            <input id="checkout-phone" name="phone" type="tel" required autocomplete="tel" placeholder="0300-1234567 (Delivery updates ke liye)" />
            <small class="field-hint">Courier dispatch updates aur confirmation ke liye apna active number likhein.</small>
          </div>
          <div class="form-group">
            <label for="checkout-address">Delivery Address <span class="req">*</span></label>
            <textarea id="checkout-address" name="address" required rows="2" autocomplete="street-address" placeholder="House / Flat #, Street name, Sector / Area, Landmark..."></textarea>
          </div>
          <div class="checkout-row">
            <div class="form-group">
              <label for="checkout-city">City <span class="req">*</span></label>
              <input id="checkout-city" name="city" required list="pk-cities" autocomplete="address-level2" placeholder="e.g. Lahore, Karachi, Islamabad..." />
              <datalist id="pk-cities">
                <option value="Lahore"></option>
                <option value="Karachi"></option>
                <option value="Islamabad"></option>
                <option value="Rawalpindi"></option>
                <option value="Faisalabad"></option>
                <option value="Multan"></option>
                <option value="Peshawar"></option>
                <option value="Quetta"></option>
                <option value="Sialkot"></option>
                <option value="Gujranwala"></option>
                <option value="Hyderabad"></option>
                <option value="Bahawalpur"></option>
              </datalist>
            </div>
            <div class="form-group">
              <label for="checkout-payment">Payment Method <span class="req">*</span></label>
              <select id="checkout-payment" name="payment_method" required>
                <option value="Cash on Delivery" selected>💵 Cash on Delivery (COD) - Recommended</option>
                <option value="EasyPaisa">📱 EasyPaisa</option>
                <option value="JazzCash">📱 JazzCash</option>
                <option value="Credit / Debit Card">💳 Credit / Debit Card</option>
              </select>
            </div>
          </div>
          <div class="cod-reassurance-box">
            <span class="cod-icon">🛡️</span>
            <div class="cod-text">
              <strong>Cash on Delivery Available Across Pakistan</strong>
              <small>Parcel haath me le kar rider ko payment karein. Delivery bilkul muft hai.</small>
            </div>
          </div>
          <button class="button checkout-submit-btn" type="submit">
            <span>Confirm Order • ${money(cartTotal())}</span>
            <span>→</span>
          </button>
          <div class="checkout-trust-row">
            <span>✓ 100% Genuine</span>
            <span>✓ Free Delivery</span>
            <span>✓ Inspect Parcel on Delivery</span>
          </div>
        </form>
      </div>
    </div>
    
    <div class="thank-you-modal" id="thank-you-modal" aria-hidden="true"></div>
    <div class="overlay"></div>
    <div class="toast" role="status"></div>
  `;

  bindEvents();
  setupPromoCarousel();
}

function showToast(text) { 
  const toast = document.querySelector('.toast'); 
  if (!toast) return; 
  toast.textContent = text; 
  toast.classList.add('show'); 
  setTimeout(() => toast.classList.remove('show'), 2600); 
}

function add(id) { 
  const product = products.find(p => p.id === id); 
  if (!product) return;
  const line = cart.find(p => p.id === id); 
  line ? line.quantity++ : cart.push({ ...product, quantity: 1 }); 
  save(); 
  render(); 
  document.querySelector('.cart-panel')?.classList.add('open'); 
  showToast(`${product.name} added to your bag`); 
}

function bindEvents() {
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => add(button.dataset.add));
  document.querySelector('.cart-trigger')?.addEventListener('click', () => document.querySelector('.cart-panel')?.classList.add('open'));
  document.querySelectorAll('.close-cart, .overlay').forEach(button => button.onclick = () => document.querySelector('.cart-panel')?.classList.remove('open'));
  document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => { 
    cart = cart.filter(p => p.id !== button.dataset.remove); 
    save(); 
    render(); 
    document.querySelector('.cart-panel')?.classList.add('open'); 
  });
  document.querySelectorAll('[data-product]').forEach(button => button.onclick = () => add(button.dataset.product));
  document.querySelectorAll('[data-details]').forEach(button => button.onclick = () => showProductDetails(button.dataset.details));
  document.querySelector('.menu-button')?.addEventListener('click', () => document.querySelector('.mobile-menu')?.classList.add('open'));
  document.querySelector('.close-menu')?.addEventListener('click', () => document.querySelector('.mobile-menu')?.classList.remove('open'));

  // Mobile live search bar input
  const searchInput = document.querySelector('#mobile-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      updateProductGrid();
      const clearBtn = document.querySelector('#clear-search-btn');
      if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
    });
  }

  // Clear search button
  const clearBtn = document.querySelector('#clear-search-btn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      clearBtn.style.display = 'none';
      updateProductGrid();
    };
  }

  // Mobile circular category icon click
  document.querySelectorAll('.category-circle-btn').forEach(btn => {
    btn.onclick = () => {
      const cat = btn.dataset.cat;
      activeCategory = cat;
      document.querySelectorAll('.category-circle-btn').forEach(b => b.classList.toggle('active', b.dataset.cat.toLowerCase() === cat.toLowerCase()));
      updateProductGrid();
      document.querySelector('#shop')?.scrollIntoView({ behavior: 'smooth' });
    };
  });

  // Desktop quick filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.onclick = () => {
      activeCategory = pill.dataset.filter;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === activeCategory));
      document.querySelectorAll('.category-circle-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === activeCategory));
      updateProductGrid();
    };
  });

  // Category links in menu and desktop categories section
  document.querySelectorAll('[data-category-link]').forEach(link => link.onclick = (e) => {
    e.preventDefault();
    const category = link.dataset.categoryLink;
    activeCategory = category;
    document.querySelector('.mobile-menu')?.classList.remove('open');
    document.querySelectorAll('.category-circle-btn').forEach(b => b.classList.toggle('active', b.dataset.cat.toLowerCase() === category.toLowerCase()));
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter.toLowerCase() === category.toLowerCase()));
    updateProductGrid();
    document.querySelector('#shop')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelector('#view-all')?.addEventListener('click', () => { 
    activeCategory = 'all'; 
    searchQuery = '';
    const mobileSearch = document.querySelector('#mobile-search-input');
    if (mobileSearch) mobileSearch.value = '';
    document.querySelectorAll('.category-circle-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
    updateProductGrid();
  });

  document.querySelector('#newsletter-form')?.addEventListener('submit', event => { 
    event.preventDefault(); 
    event.target.reset(); 
    showToast('Welcome to the Classic circle.'); 
  });

  document.querySelector('.checkout')?.addEventListener('click', () => {
    document.querySelector('.cart-panel')?.classList.remove('open');
    document.querySelector('.checkout-modal')?.classList.add('open');
  });
  document.querySelector('.close-checkout')?.addEventListener('click', closeCheckout);
  document.querySelector('#checkout-form')?.addEventListener('submit', submitOrder);
}

function showProductDetails(id) {
  const product = products.find(item => item.id === id); if (!product) return;
  const modal = document.createElement('div');
  modal.className = 'product-detail-modal';
  modal.innerHTML = `<div class="product-detail"><button class="close-detail" aria-label="Close">×</button><img src="${product.image}" alt="${product.name}"/><div><p class="eyebrow">${product.type}</p><h2>${product.name}</h2><strong>${money(Number(product.price))}</strong><p>${product.description || 'A considered beauty essential, selected for your everyday ritual.'}</p><button class="button" data-detail-add="${product.id}">Add to bag <span>→</span></button></div></div>`;
  document.body.append(modal);
  modal.querySelector('.close-detail').onclick = () => modal.remove();
  modal.querySelector('[data-detail-add]').onclick = () => { add(product.id); modal.remove(); };
}

async function hydrateStorefront() {
  if (!supabaseConfigured) return;
  const [{ data: categoryData }, { data: productData }] = await Promise.all([
    supabase.from('categories').select('name').order('created_at'),
    supabase.from('products').select('*, categories(name)').eq('status', 'in_stock').order('created_at', { ascending: false })
  ]);
  if (categoryData?.length) categories = categoryData.map(category => category.name);
  if (productData?.length) products = productData.map(product => ({ 
    ...product, 
    type: product.categories?.name || 'Uncategorized', 
    image: product.images?.[0] || '',
    originalPrice: product.compare_at_price || product.original_price || (product.price ? Math.round(Number(product.price) * 1.35) : 0),
    rating: product.rating || 4.8,
    reviews: product.reviews || 28
  }));
  render();
}

function subscribeToCatalogue() {
  if (!supabaseConfigured || catalogueChannel) return;
  catalogueChannel = supabase.channel('storefront-catalogue-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, hydrateStorefront)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, hydrateStorefront)
    .subscribe();
}

function closeCheckout() { 
  document.querySelector('.checkout-modal')?.classList.remove('open'); 
}

function showThankYouModal(order) {
  const modal = document.querySelector('#thank-you-modal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="thank-you-dialog" role="dialog" aria-modal="true" aria-labelledby="thankyou-title">
      <button class="close-thankyou" aria-label="Close confirmation">×</button>
      <div class="thankyou-badge-wrap">
        <div class="thankyou-icon">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
      <span class="thankyou-tag">✦ ORDER CONFIRMED · MUBARAK HO! ✦</span>
      <h2 id="thankyou-title">Shukriya, ${order.name || order.customer_name}!</h2>
      <p class="thankyou-sub">Aapka order kamyabi ke sath place ho gaya hai. Hamari dispatch team jald hi aapka parcel pack karke courier ke hawale karegi.</p>
      
      <div class="thankyou-order-pill">
        <span>Order Number:</span> <strong>#${order.order_number}</strong>
        <span class="pill-dot">·</span>
        <span class="pill-status">Confirmed</span>
      </div>

      <div class="thankyou-info-card">
        <div class="info-row">
          <span class="info-label">Customer Name:</span>
          <span class="info-val">${order.name || order.customer_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">WhatsApp / Phone:</span>
          <span class="info-val">${order.phone || order.customer_phone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Delivery Address:</span>
          <span class="info-val">${order.address || order.customer_address}, ${order.city}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Method:</span>
          <span class="info-val"><strong>${order.payment_method}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Estimated Delivery:</span>
          <span class="info-val">2–4 Business Days (TCS / Leopard)</span>
        </div>
      </div>

      <div class="thankyou-items-summary">
        <div class="items-head">
          <span>Ordered Items (${order.items.reduce((sum, item) => sum + item.quantity, 0)})</span>
          <span>${money(order.total_amount)}</span>
        </div>
        <div class="items-list">
          ${order.items.map(item => `
            <div class="thankyou-item-row">
              <img src="${item.image}" alt="${item.product_name || item.name}" />
              <div class="item-details">
                <strong>${item.product_name || item.name}</strong>
                <small>${money(item.unit_price || item.price)} × ${item.quantity}</small>
              </div>
              <span class="item-total">${money((item.unit_price || item.price) * item.quantity)}</span>
            </div>
          `).join('')}
        </div>
        <div class="delivery-free-notice">
          <span>Delivery Fee:</span>
          <strong style="color: #27ae60;">FREE (Rs. 0)</strong>
        </div>
      </div>

      <div class="thankyou-actions">
        <button class="button thankyou-continue-btn" id="close-thankyou-btn">Continue Shopping <span>→</span></button>
        <a class="button whatsapp-btn" href="https://wa.me/923222495034?text=${encodeURIComponent(`Salam Classic Cosmetics! I just placed order #${order.order_number} for Rs. ${order.total_amount}. Could you please confirm my order dispatch updates?`)}" target="_blank" rel="noopener noreferrer">
          Chat on WhatsApp <span>💬</span>
        </a>
      </div>

      <p class="thankyou-reassurance">
        🔒 Parcel receive karte waqt courier rider ke samne check karne ki sahulat muyassar hai.
      </p>
    </div>
  `;
  modal.classList.add('open');
  modal.querySelectorAll('.close-thankyou, #close-thankyou-btn').forEach(btn => {
    btn.onclick = () => modal.classList.remove('open');
  });
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('open');
  };
}

async function submitOrder(event) {
  event.preventDefault();
  if (!cart.length) return showToast('Your bag is empty.');
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim();
  const address = formData.get('address')?.toString().trim();
  const city = formData.get('city')?.toString().trim();
  const payment_method = formData.get('payment_method') || 'Cash on Delivery';

  if (!name || !phone || !address || !city) {
    return showToast('Please complete all delivery fields.');
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Confirming order…';
  }

  const orderNumber = `CC-${Math.floor(100000 + Math.random() * 900000)}`;
  const order = {
    order_number: orderNumber,
    name, customer_name: name,
    phone, customer_phone: phone,
    address, customer_address: address,
    city, payment_method,
    items: cart.map(({ id, name, price, quantity, image }) => ({
      product_id: id,
      product_name: name,
      unit_price: price,
      quantity,
      image
    })),
    total_amount: cartTotal(),
    status: 'Pending',
    order_status: 'pending'
  };

  if (supabaseConfigured) {
    try {
      await supabase.from('orders').insert(order);
    } catch (err) {
      console.warn('Supabase order insert note:', err);
    }
  }

  // Backup order to live orders feed & local storage
  liveOrders.unshift(order);
  const localOrders = JSON.parse(localStorage.getItem('classic-orders') || '[]');
  localOrders.unshift(order);
  localStorage.setItem('classic-orders', JSON.stringify(localOrders));

  // 1. Checkout page/form turant band ho jaye (disappear)
  closeCheckout();

  // Clear customer cart and re-render header/cart badges
  const placedOrder = { ...order };
  cart = [];
  save();
  render();

  // 2. Uski jagah ek bada, clear "Thank You" confirmation message show ho (order confirm hone ki khushkhabri ke sath)
  showThankYouModal(placedOrder);
}

async function fetchOrders() {
  if (!supabaseConfigured) return;
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (!error) {
    liveOrders = data;
    ordersLoaded = true;
    const activeForm = document.activeElement?.closest('#product-form, #category-form, #checkout-form');
    if (!activeForm) renderAdmin();
  }
}

function subscribeToOrders() {
  if (!supabaseConfigured || ordersChannel) return;
  ordersChannel = supabase.channel('admin-orders-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
      if (payload.eventType === 'DELETE') liveOrders = liveOrders.filter(order => order.id !== payload.old.id);
      else { const index = liveOrders.findIndex(order => order.id === payload.new.id); if (index >= 0) liveOrders[index] = payload.new; else liveOrders.unshift(payload.new); }
      ordersLoaded = true;
      if (window.location.pathname.startsWith('/admin') && !document.activeElement?.closest('form')) renderAdmin();
    }).subscribe();
}

function startOrdersPolling() {
  if (!supabaseConfigured || ordersPoller) return;
  ordersPoller = window.setInterval(() => {
    if (!document.activeElement?.closest('form')) fetchOrders();
  }, 10000);
}

async function updateOrderStatus(id, status) {
  if (!supabaseConfigured) return showToast('Add Supabase keys to update orders.');
  const { error } = await supabase.from('orders').update({ status, order_status: status.toLowerCase() }).eq('id', id);
  if (error) return showToast(`Status update failed: ${error.message}`);
  showToast('Order status updated.'); fetchOrders();
}

const orders = [
  { no: 'CC-2026092601', name: 'Areeba Khan', amount: 5280, payment: 'COD', status: 'Pending', time: '12 min ago' },
  { no: 'CC-2026092598', name: 'Sara Ahmed', amount: 3490, payment: 'EasyPaisa', status: 'Processing', time: '1 hr ago' },
  { no: 'CC-2026092596', name: 'Hina Malik', amount: 4670, payment: 'JazzCash', status: 'Confirmed', time: '3 hrs ago' },
  { no: 'CC-2026092591', name: 'Maham Ali', amount: 2490, payment: 'COD', status: 'Delivered', time: 'Yesterday' }
];

let adminView = 'overview';
let managementLoaded = false;
let categories = JSON.parse(localStorage.getItem('classic-categories') || 'null') || ['Skincare', 'Makeup', 'Fragrance', 'Bath & Body'];
let brands = JSON.parse(localStorage.getItem('classic-brands') || 'null') || [];
let managedProducts = JSON.parse(localStorage.getItem('classic-products') || 'null') || products.map(product => ({ ...product, description: '' }));
const saveAdminData = () => { localStorage.setItem('classic-categories', JSON.stringify(categories)); localStorage.setItem('classic-brands', JSON.stringify(brands)); localStorage.setItem('classic-products', JSON.stringify(managedProducts)); };
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function syncManagementData() {
  if (!supabaseConfigured) return;
  const [{ data: categoryData }, { data: brandData }, { data: productData }] = await Promise.all([supabase.from('categories').select('*').order('name'), supabase.from('brands').select('*, categories(name)').order('name'), supabase.from('products').select('*, categories(name), brands(name)').order('created_at', { ascending: false })]);
  if (categoryData?.length) categories = categoryData.map(category => category.name);
  if (brandData) brands = brandData.map(brand => ({ id: brand.id, name: brand.name, category: brand.categories?.name || '' }));
  if (productData?.length) managedProducts = productData.map(product => ({ ...product, type: product.categories?.name || 'Uncategorized', brand: product.brands?.name || '', image: product.images?.[0] || '' }));
  managementLoaded = true; saveAdminData();
  if (!document.activeElement?.closest('form')) renderAdmin();
}

function ordersView(displayedOrders) {
  return `<section class="admin-card orders-card"><div class="card-title"><div><p class="eyebrow">Live order feed</p><h2>Customer orders</h2></div><button class="add-product" id="refresh-orders">↻ Refresh</button></div><div class="orders-table"><div class="table-head order-head"><span>Order / date</span><span>Customer & phone</span><span>Address</span><span>Items</span><span>Payment</span><span>Total</span><span>Status</span></div>${displayedOrders.map(o=>{const real=o.id;const name=o.name||o.customer_name;const phone=o.phone||o.customer_phone||'—';const address=[o.address||o.customer_address,o.city].filter(Boolean).join(', ')||'—';const items=o.items?.map(i=>`<span class="order-item">${i.image?`<img src="${i.image}" alt=""/>`:''}${i.product_name||i.name} ×${i.quantity}</span>`).join('')||'Order items';const status=o.status||o.order_status||'Pending';return `<div class="order-row order-details"><span><strong>${o.order_number||o.no||String(real||'').slice(0,8)}</strong><small>${o.created_at?new Date(o.created_at).toLocaleDateString('en-PK'):o.time}</small></span><span>${name}<small>${phone}</small></span><span>${address}</span><span class="order-items">${items}</span><span>${o.payment_method||o.payment}</span><span>${money(Number(o.total_amount||o.amount))}</span><span>${real?`<select class="status-select" data-order-id="${real}">${['Pending','Processing','Confirmed','Shipped','Delivered','Cancelled'].map(s=>`<option ${s.toLowerCase()===(status||'').toLowerCase()?'selected':''}>${s}</option>`).join('')}</select>`:`<b class="status pending">${status}</b>`}</span></div>`}).join('')}</div></section>`;
}

function mountBrandControls() {
  const productForm = document.querySelector('#product-form');
  if (productForm && !productForm.elements.brand) {
    const categoryLabel = productForm.elements.category.closest('label');
    const label = document.createElement('label');
    label.innerHTML = `Brand<select name="brand"><option value="">No brand</option>${brands.filter(brand => brand.category === productForm.elements.category.value).map(brand => `<option value="${brand.name}">${brand.name}</option>`).join('')}</select>`;
    categoryLabel.insertAdjacentElement('afterend', label);
    productForm.elements.category.addEventListener('change', () => {
      const selected = productForm.elements.category.value;
      productForm.elements.brand.innerHTML = `<option value="">No brand</option>${brands.filter(brand => brand.category === selected).map(brand => `<option value="${brand.name}">${brand.name}</option>`).join('')}`;
    });
  }
  const categoriesPanel = document.querySelector('#category-form')?.closest('.admin-card');
  if (categoriesPanel && !document.querySelector('#brand-form')) {
    const panel = document.createElement('div');
    panel.className = 'brand-manager';
    panel.innerHTML = `<p class="eyebrow">Sub-categories</p><h2>Brands</h2><form id="brand-form" class="manager-form"><label>Category<select name="category">${categories.map(category => `<option>${category}</option>`).join('')}</select></label><input name="name" required placeholder="e.g. Garnier"/><button class="button">Add brand <span>→</span></button></form><div class="manager-list">${brands.length ? brands.map((brand, index) => `<div><span><strong>${brand.name}</strong><small>${brand.category}</small></span><span><button data-rename-brand="${index}">Rename</button><button data-delete-brand="${index}">Delete</button></span></div>`).join('') : '<p class="empty-state">No brands added yet.</p>'}</div>`;
    categoriesPanel.append(panel);
  }
}

function renderAdmin() {
  const authenticated = sessionStorage.getItem('classic-admin') === 'true';
  const displayedOrders = liveOrders.length ? liveOrders : orders;
  document.querySelector('#app').innerHTML = authenticated ? `<div class="admin-shell">
    <aside class="admin-sidebar"><a class="logo" href="/"><span>CLASSIC</span><em>cosmetics</em></a><p class="admin-label">Administration</p>${[['overview','▦ Overview'],['products','◈ Products'],['categories','◇ Categories'],['orders','□ Orders']].map(([view,label])=>`<button class="admin-nav ${adminView===view?'active':''}" data-view="${view}">${label}${view==='products'?`<b>${managedProducts.length}</b>`:view==='orders'?`<b>${liveOrders.length||orders.length}</b>`:''}</button>`).join('')}<div class="admin-spacer"></div><a class="admin-nav" href="/">↗ View storefront</a><button class="admin-nav" id="logout">↪ Log out</button></aside>
    <main class="admin-main"><header class="admin-top"><div><p class="eyebrow">Friday, 26 September</p><h1>Good morning, Classic.</h1></div><div class="admin-actions"><button class="notification">♧<b>4</b></button><button class="profile">CC <span>Administrator</span>⌄</button></div></header>
      ${adminView==='overview'?`<section class="stats"><article><span>Today's revenue</span><strong>Rs. 18,420</strong><small class="up">↑ 12.5% from yesterday</small></article><article><span>Orders today</span><strong>${liveOrders.length||12}</strong><small class="up">Live order feed</small></article><article><span>Categories</span><strong>${categories.length}</strong><small>Organize your shop</small></article><article><span>Products</span><strong>${managedProducts.length}</strong><small>In the catalogue</small></article></section>`:''}
      ${adminView==='overview'?`<section class="dashboard-grid"><article class="admin-card revenue"><div class="card-title"><div><p class="eyebrow">Performance</p><h2>Revenue overview</h2></div></div><div class="chart"><div class="bars"><i style="height:40%"></i><i style="height:58%"></i><i style="height:45%"></i><i style="height:71%"></i><i style="height:59%"></i><i style="height:88%"></i><i style="height:76%"></i></div></div></article><article class="admin-card top-products"><div class="card-title"><div><p class="eyebrow">This month</p><h2>Best sellers</h2></div></div>${managedProducts.slice(0,3).map(p=>`<div class="top-product"><img src="${p.image}" alt=""/><span><strong>${p.name}</strong><small>${p.type}</small></span><b>${money(Number(p.price))}</b></div>`).join('')}</article></section>`:''}
      ${adminView==='categories'?`<section class="manager-grid"><article class="admin-card"><p class="eyebrow">Shop structure</p><h2>Categories</h2><form id="category-form" class="manager-form"><input name="name" required placeholder="e.g. Body Care"/><button class="button">Add category <span>→</span></button></form><div class="manager-list">${categories.map((category,index)=>`<div><strong>${category}</strong><span><button data-rename-category="${index}">Rename</button><button data-delete-category="${index}">Delete</button></span></div>`).join('')}</div></article></section>`:''}
      ${adminView==='products'?`<section class="manager-grid"><article class="admin-card"><p class="eyebrow">Catalogue</p><h2 id="product-form-title">Add product</h2><form id="product-form" class="manager-form product-form"><input type="hidden" name="index" value=""/><label>Name<input name="name" required/></label><label>Category<select name="category" required>${categories.map(c=>`<option>${c}</option>`).join('')}</select></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><label>Sale Price (Rs.)<input name="price" type="number" min="0" required/></label><label>Cut Price / Compare Price (Rs.)<input name="originalPrice" type="number" min="0" placeholder="e.g. 3500"/></label></div><label>Shade / variant<input name="shade"/></label><label>Product image<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required/><small class="file-hint">Choose from your device. It uploads to the secure product-images bucket.</small></label><label>Details<textarea name="description" rows="3"></textarea></label><button class="button">Save product <span>→</span></button></form></article><article class="admin-card"><p class="eyebrow">Your collection</p><h2>Products</h2><div class="manager-list product-list">${managedProducts.map((product,index)=>`<div><img src="${product.image}" alt=""/><span><strong>${product.name}</strong><small>${product.type} · ${money(Number(product.price))}</small></span><span><button data-edit-product="${index}">Edit</button><button data-delete-product="${index}">Delete</button></span></div>`).join('')}</div></article></section>`:''}
      ${adminView==='orders'?ordersView(displayedOrders):''}
    </main></div>` : `<main class="admin-login"><a class="logo" href="/"><span>CLASSIC</span><em>cosmetics</em></a><section><p class="eyebrow">Private access</p><h1>Welcome back.</h1><p>Sign in to manage your Classic Cosmetics store.</p><form id="admin-login"><label>Email address<input name="email" required type="email" placeholder="admin@classiccosmetics.com" /></label><label>Password<input name="password" required type="password" placeholder="••••••••" /></label><p id="login-error" class="login-error" role="alert"></p><button class="button" type="submit">Sign in <span>→</span></button></form><small>Demo account only. Connect Supabase Auth for production access.</small></section></main>`;
  document.querySelector('#admin-login')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get('email');
    const password = form.get('password');
    if (!supabaseConfigured && email === 'admin@classiccosmetics.com' && password === 'Classic@2026') {
      sessionStorage.setItem('classic-admin', 'true'); renderAdmin();
    } else if (supabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { document.querySelector('#login-error').textContent = error.message; return; }
      sessionStorage.setItem('classic-admin', 'true'); renderAdmin();
    } else document.querySelector('#login-error').textContent = 'Email or password is incorrect.';
  });
  const adminMain = document.querySelector('.admin-main');
  document.querySelector('#logout')?.addEventListener('click', async () => { if (supabaseConfigured) await supabase.auth.signOut(); if (ordersPoller) { clearInterval(ordersPoller); ordersPoller = null; } if (ordersChannel) { supabase?.removeChannel(ordersChannel); ordersChannel = null; } sessionStorage.removeItem('classic-admin'); renderAdmin(); });
  document.querySelector('.admin-sidebar')?.addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (button) { adminView = button.dataset.view; renderAdmin(); } });
  adminMain?.addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.id === 'refresh-orders') return fetchOrders();
    if (button.dataset.deleteCategory !== undefined) { const name = categories[Number(button.dataset.deleteCategory)]; categories = categories.filter(category => category !== name); saveAdminData(); renderAdmin(); if (supabaseConfigured) await supabase.from('categories').delete().eq('name', name); }
    if (button.dataset.renameCategory !== undefined) { const index = Number(button.dataset.renameCategory); const oldName = categories[index]; const name = window.prompt('New category name', oldName)?.trim(); if (!name || name === oldName) return; categories[index] = name; managedProducts = managedProducts.map(product => product.type === oldName ? { ...product, type: name } : product); saveAdminData(); renderAdmin(); if (supabaseConfigured) await supabase.from('categories').update({ name, slug: slugify(name) }).eq('name', oldName); }
    if (button.dataset.deleteProduct !== undefined) { const product = managedProducts[Number(button.dataset.deleteProduct)]; managedProducts.splice(Number(button.dataset.deleteProduct), 1); saveAdminData(); renderAdmin(); if (supabaseConfigured) await supabase.from('products').delete().eq('id', product.id); }
    if (button.dataset.editProduct !== undefined) { const product = managedProducts[Number(button.dataset.editProduct)]; const form = document.querySelector('#product-form'); form.elements.imageFile.required = false; Object.entries({ index: button.dataset.editProduct, name: product.name, category: product.type, price: product.price, originalPrice: product.originalPrice || '', shade: product.shade || '', description: product.description || '' }).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; }); if (form.elements.brand) { form.elements.brand.innerHTML = `<option value="">No brand</option>${brands.filter(brand => brand.category === product.type).map(brand => `<option value="${brand.name}">${brand.name}</option>`).join('')}`; form.elements.brand.value = product.brand || ''; } document.querySelector('#product-form-title').textContent = `Edit ${product.name}`; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (button.dataset.deleteBrand !== undefined) { const brand = brands[Number(button.dataset.deleteBrand)]; brands.splice(Number(button.dataset.deleteBrand), 1); saveAdminData(); renderAdmin(); if (supabaseConfigured) await supabase.from('brands').delete().eq('id', brand.id); }
    if (button.dataset.renameBrand !== undefined) { const index = Number(button.dataset.renameBrand); const oldBrand = brands[index]; const name = window.prompt('New brand name', oldBrand.name)?.trim(); if (!name || name === oldBrand.name) return; brands[index] = { ...oldBrand, name }; managedProducts = managedProducts.map(product => product.brand === oldBrand.name ? { ...product, brand: name } : product); saveAdminData(); renderAdmin(); if (supabaseConfigured) await supabase.from('brands').update({ name }).eq('id', oldBrand.id); }
  });
  adminMain?.addEventListener('change', event => { if (event.target.matches('.status-select')) updateOrderStatus(event.target.dataset.orderId, event.target.value); });
  document.querySelector('#category-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const name = new FormData(event.currentTarget).get('name').trim(); if (!name || categories.includes(name)) return;
    categories.push(name); saveAdminData(); renderAdmin();
    if (supabaseConfigured) { const { error } = await supabase.from('categories').upsert({ name, slug: slugify(name) }); if (error) showToast(`Category saved locally: ${error.message}`); }
  });
  document.querySelector('#brand-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const category = form.get('category'); const name = form.get('name').trim(); if (!name || brands.some(brand => brand.category === category && brand.name === name)) return;
    let brand = { id: crypto.randomUUID(), name, category };
    if (supabaseConfigured) { const { data: categoryRow } = await supabase.from('categories').select('id').eq('name', category).single(); const { data, error } = await supabase.from('brands').insert({ name, category_id: categoryRow?.id }).select().single(); if (error) return showToast(`Brand save failed: ${error.message}`); brand.id = data.id; }
    brands.push(brand); saveAdminData(); renderAdmin();
  });
  document.querySelector('#product-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const index = form.get('index'); const existing = index === '' ? null : managedProducts[Number(index)]; const file = form.get('imageFile');
    if (!existing && !(file instanceof File && file.size)) return showToast('Please choose a product image.');
    let image = existing?.image || '';
    if (file instanceof File && file.size) {
      if (!supabaseConfigured) return showToast('Add Supabase keys before uploading product images.');
      const extension = file.name.split('.').pop(); const path = `products/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) return showToast(`Image upload failed: ${uploadError.message}`);
      image = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }
    const originalPrice = Number(form.get('originalPrice')) || (Number(form.get('price')) > 0 ? Math.round(Number(form.get('price')) * 1.35) : 0);
    const product = { id: existing?.id || crypto.randomUUID(), name: form.get('name'), type: form.get('category'), brand: form.get('brand') || '', price: Number(form.get('price')), originalPrice, shade: form.get('shade'), description: form.get('description'), image, rating: existing?.rating || 4.8, reviews: existing?.reviews || 28 };
    if (supabaseConfigured) { const [{ data: category }, { data: brand }] = await Promise.all([supabase.from('categories').select('id').eq('name', product.type).maybeSingle(), product.brand ? supabase.from('brands').select('id').eq('name', product.brand).maybeSingle() : Promise.resolve({ data: null })]); const payload = { name: product.name, description: product.description, category_id: category?.id || null, brand_id: brand?.id || null, price: product.price, stock: 1, status: 'in_stock', images: [product.image] }; const request = existing ? supabase.from('products').update(payload).eq('id', product.id).select().single() : supabase.from('products').insert(payload).select().single(); const { data, error } = await request; if (error) return showToast(`Product save failed: ${error.message}`); product.id = data.id; }
    if (existing) managedProducts[Number(index)] = product; else managedProducts.push(product); products = managedProducts; saveAdminData(); renderAdmin(); showToast('Product saved.');
  });
  mountBrandControls();
  if (authenticated && supabaseConfigured) { subscribeToOrders(); startOrdersPolling(); if (!ordersLoaded && (adminView === 'overview' || adminView === 'orders')) fetchOrders(); if (!managementLoaded && (adminView === 'products' || adminView === 'categories')) syncManagementData(); }
}

if (window.location.pathname.startsWith('/admin')) renderAdmin(); else { render(); hydrateStorefront(); subscribeToCatalogue(); }
