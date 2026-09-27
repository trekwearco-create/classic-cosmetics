import './style.css';
import './checkout.css';
import './admin-management.css';
import './storefront-pages.css';
import { supabase, supabaseConfigured } from './supabase.js';

/* ==========================================================================
   DEFAULT STATE & DATA MODELS
   ========================================================================== */
const defaultProducts = [
  { id: 'rose-serum', name: 'Rose Renewal Serum', type: 'Skincare', brand: 'Garnier', price: 2490, originalPrice: 3890, rating: 4.9, reviews: 42, shade: 'rose', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=85', description: 'A deeply restorative rose nectar serum designed to hydrate, soften fine lines, and restore natural luminosity. Formulated with pure botanical extracts.' },
  { id: 'silk-foundation', name: 'Silk Veil Foundation', type: 'Makeup', brand: 'Maybelline', price: 1890, originalPrice: 2700, rating: 4.8, reviews: 29, shade: 'sand', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=85', description: 'Weightless, medium-to-full buildable coverage with a luminous, skin-like finish. Humidity-resistant and breathable for all-day comfort.' },
  { id: 'gold-elixir', name: 'Golden Glow Elixir', type: 'Skincare', brand: 'The Ordinary', price: 2790, originalPrice: 4200, rating: 4.9, reviews: 58, shade: 'gold', image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=700&q=85', description: 'Enriched with cold-pressed botanical oils and illuminating golden micro-particles. Nourishes tired skin and imparts an ethereal sunlit glow.' },
  { id: 'velvet-lip', name: 'Velvet Petal Lip Color', type: 'Makeup', brand: "L'Oréal Paris", price: 1290, originalPrice: 1990, rating: 4.9, reviews: 88, shade: 'berry', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=85', description: 'An ultra-comfortable velvet matte lip cream offering intense pigment payoff and non-drying hydration in a single sweep.' },
  { id: 'midnight-musk', name: 'Midnight Musk Eau de Parfum', type: 'Fragrance', brand: 'Classic', price: 3490, originalPrice: 4990, rating: 5.0, reviews: 19, shade: 'ink', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=85', description: 'An alluring olfactory composition blending warm amber, velvety white musk, and night-blooming jasmine for a captivating, lingering trail.' },
  { id: 'botanical-wash', name: 'Botanical Cleansing Balm', type: 'Bath & Body', brand: 'CeraVe', price: 1590, originalPrice: 2250, rating: 4.8, reviews: 33, shade: 'leaf', image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=700&q=85', description: 'A melt-away balm-to-milk cleanser that effortlessly dissolves long-wear makeup and daily impurities while protecting the natural moisture barrier.' }
];

let products = (JSON.parse(localStorage.getItem('classic-products') || 'null') || defaultProducts).map(p => {
  if (!p.brand) {
    const match = defaultProducts.find(dp => dp.id === p.id || dp.name === p.name);
    if (match?.brand) return { ...p, brand: match.brand };
  }
  return p;
});

let categories = JSON.parse(localStorage.getItem('classic-categories') || 'null') || ['Skincare', 'Makeup', 'Fragrance', 'Bath & Body'];
let brands = JSON.parse(localStorage.getItem('classic-brands') || 'null') || [];
let sections = JSON.parse(localStorage.getItem('classic-sections') || '[]');
let cart = JSON.parse(localStorage.getItem('classic-cart') || '[]');
let liveOrders = JSON.parse(localStorage.getItem('classic-orders') || '[]');

let searchQuery = '';
let activeCategory = 'all';
let promoSlideIndex = 0;
let promoTimer = null;
let adminView = 'overview';
let ordersPoller = null;
let ordersChannel = null;
let catalogueChannel = null;
let isPollingActive = false;

/* ==========================================================================
   HELPERS
   ========================================================================== */
export const slugify = value => (value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const money = value => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
const saveCart = () => localStorage.setItem('classic-cart', JSON.stringify(cart));
const cartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
const cartTotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

const saveAdminData = () => {
  localStorage.setItem('classic-categories', JSON.stringify(categories));
  localStorage.setItem('classic-brands', JSON.stringify(brands));
  localStorage.setItem('classic-products', JSON.stringify(products));
  localStorage.setItem('classic-sections', JSON.stringify(sections));
};

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
  if (orig && orig > price) return Math.round(((orig - price) / orig) * 100);
  return 0;
}

function showToast(text) {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ==========================================================================
   ROUTING (History API & URL Parsing)
   ========================================================================== */
function getRoute() {
  const path = window.location.pathname;
  const search = new URLSearchParams(window.location.search);

  if (path.startsWith('/admin') || search.get('view') === 'admin') {
    return { view: 'admin' };
  }

  // Standalone Product Page
  if (path.startsWith('/product/') || search.get('product')) {
    const productId = search.get('product') || decodeURIComponent(path.replace('/product/', '').replace(/\/$/, ''));
    return { view: 'product', productId };
  }

  // Category -> Brand Page (e.g. /category/skincare/brand/garnier or ?category=Skincare&brand=Garnier)
  const brandMatch = path.match(/^\/category\/([^/]+)\/brand\/([^/]+)/);
  if (brandMatch || (search.get('category') && search.get('brand'))) {
    const rawCat = brandMatch ? decodeURIComponent(brandMatch[1]) : search.get('category');
    const rawBrand = brandMatch ? decodeURIComponent(brandMatch[2]) : search.get('brand');
    // Resolve proper case name
    const category = categories.find(c => slugify(c) === slugify(rawCat)) || rawCat;
    const brand = brands.find(b => slugify(b.name) === slugify(rawBrand))?.name || rawBrand;
    return { view: 'brand', category, brand };
  }

  // Standalone Category Page (e.g. /category/skincare or ?category=Skincare)
  if (path.startsWith('/category/') || search.get('category')) {
    const rawCat = search.get('category') || decodeURIComponent(path.replace('/category/', '').replace(/\/$/, ''));
    const category = categories.find(c => slugify(c) === slugify(rawCat)) || rawCat;
    return { view: 'category', category };
  }

  return { view: 'home' };
}

export function navigate(url, replace = false) {
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('popstate', () => {
  renderApp();
});

/* ==========================================================================
   CART & CHECKOUT
   ========================================================================== */
function add(id, quantity = 1) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const line = cart.find(p => p.id === id);
  if (line) line.quantity += quantity;
  else cart.push({ ...product, quantity });
  saveCart();
  updateCartUI();
  document.querySelector('.cart-panel')?.classList.add('open');
  showToast(`${product.name} added to your bag`);
}

function updateCartUI() {
  document.querySelectorAll('.cart-count-badge').forEach(b => {
    b.textContent = cartCount();
  });
  const cartItemsContainer = document.querySelector('.cart-items-container');
  const cartFooter = document.querySelector('.cart-footer');
  if (cartItemsContainer) {
    if (cart.length) {
      cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <span>${item.type}</span>
            <strong>${item.name}</strong>
            <small>${money(item.price)} × ${item.quantity}</small>
          </div>
          <button data-remove="${item.id}" aria-label="Remove ${item.name}">×</button>
        </div>
      `).join('');
      if (cartFooter) {
        cartFooter.style.display = 'block';
        cartFooter.querySelector('.cart-subtotal-val').textContent = money(cartTotal());
      }
    } else {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <p>Your bag is waiting for a little beauty.</p>
          <button class="button close-cart">Continue shopping</button>
        </div>
      `;
      if (cartFooter) cartFooter.style.display = 'none';
    }
  }
}

function closeCheckout() {
  document.querySelector('.checkout-modal')?.classList.remove('open');
}

function openCheckout() {
  if (!cart.length) return showToast('Your bag is empty.');
  document.querySelector('.cart-panel')?.classList.remove('open');
  const modal = document.querySelector('.checkout-modal');
  if (modal) {
    modal.querySelector('.checkout-items-count').textContent = cartCount();
    modal.querySelector('.checkout-total-val').textContent = money(cartTotal());
    modal.classList.add('open');
  }
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
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${order.name || order.customer_name}</span></div>
        <div class="info-row"><span class="info-label">WhatsApp / Phone:</span><span class="info-val">${order.phone || order.customer_phone}</span></div>
        <div class="info-row"><span class="info-label">Delivery Address:</span><span class="info-val">${order.address || order.customer_address}, ${order.city}</span></div>
        <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-val"><strong>${order.payment_method}</strong></span></div>
        <div class="info-row"><span class="info-label">Estimated Delivery:</span><span class="info-val">2–4 Business Days (TCS / Leopard)</span></div>
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
    id: crypto.randomUUID(),
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
    order_status: 'pending',
    created_at: new Date().toISOString()
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
  localStorage.setItem('classic-orders', JSON.stringify(liveOrders));

  closeCheckout();
  const placedOrder = { ...order };
  cart = [];
  saveCart();
  updateCartUI();

  showThankYouModal(placedOrder);
}

/* ==========================================================================
   PRODUCT CARD COMPONENT
   ========================================================================== */
function productCard(product) {
  const discount = getDiscountPercentage(product);
  const origPrice = Number(product.originalPrice || product.compare_at_price || 0);
  const rating = product.rating || 4.8;
  const reviews = product.reviews || 28;

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-image-container">
        ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
        <a class="product-image-btn" href="/product/${encodeURIComponent(product.id)}" data-nav-product="${product.id}" aria-label="View ${product.name}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
        </a>
        <button class="quick-add-fab" data-add="${product.id}" aria-label="Add ${product.name} to cart" title="Add to bag">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z"/>
          </svg>
        </button>
      </div>
      <div class="product-card-body">
        <div class="product-meta-row">
          <a class="product-category-tag" href="/category/${slugify(product.type)}" data-nav-category="${product.type}">${product.type}</a>
          ${product.brand ? `<a class="product-brand-tag" href="/category/${slugify(product.type)}/brand/${slugify(product.brand)}" data-nav-brand-category="${product.type}" data-nav-brand-name="${product.brand}">${product.brand}</a>` : ''}
        </div>
        <h3 class="product-name-heading">
          <a href="/product/${encodeURIComponent(product.id)}" data-nav-product="${product.id}" title="${product.name}">${product.name}</a>
        </h3>
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

/* ==========================================================================
   COMMON LAYOUT SHELL (Header, Drawers, Footer)
   ========================================================================== */
function renderStorefrontShell(mainContentHtml) {
  return `
    <div class="announcement">
      <span>✦ 100% Genuine Products</span>
      <span class="desktop-only">Free delivery across Pakistan</span>
      <span class="desktop-only">Easy cash on delivery</span>
    </div>

    <header>
      <button class="menu-button" aria-label="Open navigation">☰</button>
      <a class="logo" href="/" data-nav-home="true">
        <span>CLASSIC</span><em>cosmetics</em>
      </a>
      <nav class="desktop-only">
        <a href="/" data-nav-home="true">Home</a>
        ${categories.map(cat => `<a href="/category/${slugify(cat)}" data-nav-category="${cat}">${cat}</a>`).join('')}
        <a href="#contact" data-nav-hash="contact">Contact</a>
      </nav>
      <div class="header-actions">
        <button class="desktop-only" aria-label="Search" onclick="document.querySelector('#mobile-search-input')?.focus()">⌕</button>
        <a href="/admin" class="desktop-only" aria-label="Admin" title="Admin Portal" style="font-size:14px;color:inherit;">♙</a>
        <button class="cart-trigger" aria-label="Open cart">
          <svg class="bag-svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 01-8 0"></path>
          </svg>
          <b class="cart-count-badge">${cartCount()}</b>
        </button>
      </div>
    </header>

    <aside class="mobile-menu">
      <button class="close-menu" aria-label="Close menu">×</button>
      <p class="eyebrow">Explore</p>
      <a href="/" data-nav-home="true">Home</a>
      ${categories.map(cat => `<a href="/category/${slugify(cat)}" data-nav-category="${cat}">${cat}</a>`).join('')}
      <a href="/admin">Admin Portal</a>
    </aside>

    <main id="main-content">
      ${mainContentHtml}
    </main>

    <footer>
      <a class="logo" href="/" data-nav-home="true"><span>CLASSIC</span><em>cosmetics</em></a>
      <div>
        <strong>Categories</strong>
        ${categories.map(cat => `<a href="/category/${slugify(cat)}" data-nav-category="${cat}">${cat}</a>`).join('')}
      </div>
      <div>
        <strong>Customer care</strong>
        <a href="#contact">Contact us</a>
        <a href="#">Delivery & returns</a>
        <a href="/admin">Admin Login</a>
      </div>
      <p>© 2026 Classic Cosmetics.<br />Elegance in every detail.</p>
    </footer>

    <a class="whatsapp" href="https://wa.me/923222495034?text=Hi%2C%20I%20have%20a%20question%20about%20a%20product" target="_blank" rel="noopener noreferrer" aria-label="Chat with Classic Cosmetics on WhatsApp">◔</a>

    <aside class="cart-panel">
      <div class="cart-head"><h2>Your bag</h2><button class="close-cart" aria-label="Close cart">×</button></div>
      <div class="cart-items cart-items-container"></div>
      <div class="cart-footer" style="${cart.length ? 'display:block' : 'display:none'}">
        <p><span>Subtotal</span><strong class="cart-subtotal-val">${money(cartTotal())}</strong></p>
        <button class="button checkout">Secure checkout <span>→</span></button>
        <small>Cash on delivery available across Pakistan</small>
      </div>
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
            <span>Items: <b class="checkout-items-count">${cartCount()}</b></span>
            <span class="free-ship-badge">🚚 Free Delivery</span>
          </div>
          <div class="summary-right">
            <span>Total: <strong class="checkout-total-val">${money(cartTotal())}</strong></span>
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
                <option value="Lahore"></option><option value="Karachi"></option><option value="Islamabad"></option>
                <option value="Rawalpindi"></option><option value="Faisalabad"></option><option value="Multan"></option>
                <option value="Peshawar"></option><option value="Quetta"></option><option value="Sialkot"></option>
              </datalist>
            </div>
            <div class="form-group">
              <label for="checkout-payment">Payment Method <span class="req">*</span></label>
              <select id="checkout-payment" name="payment_method" required>
                <option value="Cash on Delivery" selected>💵 Cash on Delivery (COD) - Recommended</option>
                <option value="EasyPaisa">📱 EasyPaisa</option>
                <option value="JazzCash">📱 JazzCash</option>
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
            <span>Confirm Order</span>
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
}

/* ==========================================================================
   PAGE 1: HOMEPAGE
   ========================================================================== */
function renderHomePage() {
  const filteredCatalogue = products;

  // Active user-created sections ONLY
  const activeSections = sections.filter(s => s.is_active !== false);

  const sectionsHtml = activeSections.map(sec => {
    let secProducts = [];
    if (sec.section_type === 'products_by_category' && sec.category) {
      secProducts = products.filter(p => (p.type || '').toLowerCase() === sec.category.toLowerCase());
    } else if (sec.section_type === 'products_by_brand' && sec.brand) {
      secProducts = products.filter(p => (p.brand || '').toLowerCase() === sec.brand.toLowerCase());
    } else {
      secProducts = products;
    }
    const maxItems = Number(sec.max_items) || 4;
    secProducts = secProducts.slice(0, maxItems);

    return `
      <section class="custom-home-section">
        <div class="custom-section-head">
          <div>
            <p class="eyebrow">${sec.category || sec.brand || 'Featured'}</p>
            <h2>${sec.title}</h2>
            ${sec.subtitle ? `<p>${sec.subtitle}</p>` : ''}
          </div>
          ${sec.category ? `<a class="text-link" href="/category/${slugify(sec.category)}" data-nav-category="${sec.category}">Explore All →</a>` : ''}
        </div>
        <div class="products">
          ${secProducts.map(productCard).join('')}
        </div>
      </section>
    `;
  }).join('');

  const homeHtml = `
    <!-- Desktop Hero Section -->
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
        <div class="category-grid">${categories.map((category, index) => `
          <a href="/category/${slugify(category)}" data-nav-category="${category}">
            <span class="cat-number">${String(index + 1).padStart(2, '0')}</span>
            <strong>${category}</strong>
            <i>View Brands & Collection →</i>
          </a>
        `).join('')}</div>
      </section>
    </div>

    <!-- Mobile Highfy-Style Flow -->
    <div class="mobile-highfy-flow">
      <div class="mobile-search-section">
        <div class="mobile-search-bar">
          <svg class="search-input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="search" id="mobile-search-input" placeholder="Search for products, brands..." value="${searchQuery}" autocomplete="off" aria-label="Search products"/>
          ${searchQuery ? `<button class="clear-search-btn" id="clear-search-btn" aria-label="Clear search">×</button>` : ''}
        </div>
      </div>

      <section class="mobile-category-row" aria-label="Categories">
        <div class="mobile-category-scroll">
          <button class="category-circle-btn active" data-cat="all">
            <div class="category-circle-img-wrap all-wrap"><span>✦</span></div>
            <span class="category-circle-label">All</span>
          </button>
          ${categories.map(category => `
            <a class="category-circle-btn" href="/category/${slugify(category)}" data-nav-category="${category}">
              <div class="category-circle-img-wrap">
                <img src="${getCategoryImage(category)}" alt="${category}" loading="lazy" />
              </div>
              <span class="category-circle-label">${category}</span>
            </a>
          `).join('')}
        </div>
      </section>

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

    <!-- User-Created Custom Sections (Dynamic) -->
    ${sectionsHtml}

    <!-- Main Storefront Catalogue -->
    <section class="featured" id="shop">
      <div class="section-heading row-heading shop-header-bar">
        <div>
          <p class="eyebrow">${searchQuery ? 'Search Results' : 'Best Sellers'}</p>
          <h2 id="shop-title">${searchQuery ? `Search: "${searchQuery}"` : 'Best Sellers'}</h2>
        </div>
        <div class="shop-filter-meta">
          <span class="product-counter">${filteredCatalogue.length} products</span>
        </div>
      </div>

      <div class="shop-filter-bar desktop-only" role="tablist">
        <button class="filter-pill active" data-filter="all">All Products</button>
        ${categories.map(cat => `<a class="filter-pill" href="/category/${slugify(cat)}" data-nav-category="${cat}">${cat}</a>`).join('')}
      </div>

      <div class="products" id="products-grid">
        ${filteredCatalogue.map(productCard).join('')}
      </div>
    </section>

    <!-- Editorial Story -->
    <section class="editorial" id="story">
      <div class="editorial-image"><img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=90" alt="Woman applying skincare" /></div>
      <div class="editorial-copy">
        <p class="eyebrow">Our philosophy</p>
        <h2>Beauty should feel<br /><i>like a pause.</i></h2>
        <p>We believe the small moments you give yourself matter most. Classic Cosmetics brings together refined, effective beauty to turn the everyday into a personal ritual.</p>
        <a class="text-link" href="#contact">Meet Classic Cosmetics →</a>
      </div>
    </section>

    <!-- Reviews -->
    <section class="reviews">
      <p class="eyebrow">Kind words</p>
      <blockquote>“The packaging, the products, the whole experience — it feels like a little luxury delivered to my door.”</blockquote>
      <div class="stars">★★★★★</div>
      <p>— AREEBA K., LAHORE</p>
    </section>

    <!-- Contact Section -->
    <section class="contact-section" id="contact">
      <div class="contact-inner">
        <div class="contact-info-col">
          <p class="eyebrow">Get in touch</p>
          <h2>Contact <i>Us</i></h2>
          <p class="contact-sub">Hamara team hamesha available hai aapki madad ke liye. Kisi bhi product ya order ke baare mein seedha rabta karein.</p>
          <div class="contact-items">
            <a class="contact-item" href="tel:+923151247533"><div class="contact-icon">📞</div><div class="contact-text"><strong>Phone</strong><span>+92 315 1247533</span></div></a>
            <a class="contact-item" href="https://wa.me/923222495034" target="_blank"><div class="contact-icon">💬</div><div class="contact-text"><strong>WhatsApp</strong><span>+92 322 2495034</span></div></a>
            <a class="contact-item" href="https://www.instagram.com/classic.cosmetic.pk" target="_blank"><div class="contact-icon">📸</div><div class="contact-text"><strong>Instagram</strong><span>@classic.cosmetic.pk</span></div></a>
          </div>
        </div>
        <div class="contact-newsletter-col">
          <p class="eyebrow">A note from us</p>
          <h3>Be first to know</h3>
          <p>New arrivals, quiet offers and beauty notes — just the lovely bits.</p>
          <form id="newsletter-form" class="newsletter-form-inline">
            <input type="email" required placeholder="Your email address" aria-label="Email address" />
            <button class="button" type="submit">Subscribe <span>→</span></button>
          </form>
        </div>
      </div>
    </section>
  `;

  return renderStorefrontShell(homeHtml);
}

/* ==========================================================================
   PAGE 2: CATEGORY PAGE (Category -> Brands Grid)
   ========================================================================== */
function renderCategoryPage(categoryName) {
  // Find all brands linked to this category
  const matchingBrands = brands.filter(b => (b.category || '').trim().toLowerCase() === categoryName.trim().toLowerCase());
  const categoryProducts = products.filter(p => (p.type || '').trim().toLowerCase() === categoryName.trim().toLowerCase());

  const categoryHtml = `
    <!-- Breadcrumb trail -->
    <div class="breadcrumbs-bar">
      <div class="breadcrumbs-inner">
        <a href="/" data-nav-home="true">Home</a>
        <span class="breadcrumbs-sep">/</span>
        <span class="breadcrumbs-current">${categoryName}</span>
      </div>
    </div>

    <!-- Category Header -->
    <section class="page-hero-header">
      <p class="eyebrow">Collection</p>
      <h1>${categoryName}</h1>
      <p class="page-subtitle">Pehle apna manpasand brand select karein ya category ke tamam products browse karein.</p>
      <div class="page-meta-pills">
        <span class="page-pill">${matchingBrands.length} Brand${matchingBrands.length === 1 ? '' : 's'}</span>
        <span class="page-pill">${categoryProducts.length} Product${categoryProducts.length === 1 ? '' : 's'}</span>
      </div>
    </section>

    <!-- Brands Grid Container -->
    <section class="category-brands-container">
      <div class="category-section-title">
        <h2>Available Brands</h2>
        <span>Select a brand to view products</span>
      </div>

      ${matchingBrands.length > 0 ? `
        <div class="brand-tiles-grid">
          ${matchingBrands.map(b => {
            const count = products.filter(p => (p.type || '').toLowerCase() === categoryName.toLowerCase() && (p.brand || '').toLowerCase() === b.name.toLowerCase()).length;
            const initial = (b.name || 'B').charAt(0).toUpperCase();
            return `
              <a class="brand-tile-card" href="/category/${slugify(categoryName)}/brand/${slugify(b.name)}" data-nav-brand-category="${categoryName}" data-nav-brand-name="${b.name}">
                <div class="brand-tile-avatar">${initial}</div>
                <strong class="brand-tile-name">${b.name}</strong>
                <span class="brand-tile-count">${count} product${count === 1 ? '' : 's'}</span>
                <span class="brand-tile-cta">Shop Brand →</span>
              </a>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state" style="padding: 40px 20px; text-align: center; background: #fff; border-radius: 12px; border: 1px dashed #ded5c8;">
          <p style="font-size: 15px; color: #777; margin-bottom: 16px;">Is category ke liye alag brands register nahi hain. Neeche tamam products browse karein.</p>
        </div>
      `}

      <!-- Category Products Showcase -->
      <div style="margin-top: 50px;">
        <div class="category-section-title">
          <h2>All ${categoryName} Products</h2>
          <span>${categoryProducts.length} items</span>
        </div>
        <div class="products">
          ${categoryProducts.length > 0 ? categoryProducts.map(productCard).join('') : '<p class="empty-state">No products in this category yet.</p>'}
        </div>
      </div>
    </section>
  `;

  return renderStorefrontShell(categoryHtml);
}

/* ==========================================================================
   PAGE 3: BRAND PAGE (Category + Brand -> Filtered Products)
   ========================================================================== */
function renderBrandPage(categoryName, brandName) {
  const brandProducts = products.filter(p => 
    (p.type || '').trim().toLowerCase() === categoryName.trim().toLowerCase() &&
    (p.brand || '').trim().toLowerCase() === brandName.trim().toLowerCase()
  );

  const brandHtml = `
    <!-- Breadcrumb trail -->
    <div class="breadcrumbs-bar">
      <div class="breadcrumbs-inner">
        <a href="/" data-nav-home="true">Home</a>
        <span class="breadcrumbs-sep">/</span>
        <a href="/category/${slugify(categoryName)}" data-nav-category="${categoryName}">${categoryName}</a>
        <span class="breadcrumbs-sep">/</span>
        <span class="breadcrumbs-current">${brandName}</span>
      </div>
    </div>

    <!-- Brand Header -->
    <section class="page-hero-header">
      <p class="eyebrow">${categoryName} · Brand Showcase</p>
      <h1>${brandName}</h1>
      <p class="page-subtitle">${brandName} ke tamam authentic beauty aur personal care products jo ${categoryName} collection me dastiyab hain.</p>
      <div class="page-meta-pills">
        <span class="page-pill">${brandProducts.length} Product${brandProducts.length === 1 ? '' : 's'}</span>
        <span class="page-pill">100% Original Guaranteed</span>
      </div>
    </section>

    <!-- Product Grid -->
    <section class="category-brands-container">
      <div class="products">
        ${brandProducts.length > 0 
          ? brandProducts.map(productCard).join('') 
          : `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: #fff; border-radius: 12px; border: 1px dashed #ded5c8;">
              <p style="font-size: 16px; color: #666; margin-bottom: 16px;">Abhi ${brandName} me is category ke products available nahi hain.</p>
              <a class="button" href="/category/${slugify(categoryName)}" data-nav-category="${categoryName}">Browse other ${categoryName} brands <span>→</span></a>
            </div>
          `}
      </div>
    </section>
  `;

  return renderStorefrontShell(brandHtml);
}

/* ==========================================================================
   PAGE 4: STANDALONE PRODUCT PAGE
   ========================================================================== */
function renderProductPage(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    return renderStorefrontShell(`
      <div style="padding: 100px 20px; text-align: center;">
        <h2>Product not found</h2>
        <p style="color: #777; margin: 16px 0 24px;">The product you are looking for is no longer available.</p>
        <a class="button" href="/" data-nav-home="true">Back to Home <span>→</span></a>
      </div>
    `);
  }

  const discount = getDiscountPercentage(product);
  const origPrice = Number(product.originalPrice || product.compare_at_price || 0);
  const rating = product.rating || 4.8;
  const reviews = product.reviews || 28;

  // Related products from same category or brand
  const relatedProducts = products
    .filter(p => p.id !== product.id && (p.type === product.type || (product.brand && p.brand === product.brand)))
    .slice(0, 3);

  const productHtml = `
    <!-- Breadcrumb trail -->
    <div class="breadcrumbs-bar">
      <div class="breadcrumbs-inner">
        <a href="/" data-nav-home="true">Home</a>
        <span class="breadcrumbs-sep">/</span>
        <a href="/category/${slugify(product.type)}" data-nav-category="${product.type}">${product.type}</a>
        ${product.brand ? `
          <span class="breadcrumbs-sep">/</span>
          <a href="/category/${slugify(product.type)}/brand/${slugify(product.brand)}" data-nav-brand-category="${product.type}" data-nav-brand-name="${product.brand}">${product.brand}</a>
        ` : ''}
        <span class="breadcrumbs-sep">/</span>
        <span class="breadcrumbs-current">${product.name}</span>
      </div>
    </div>

    <!-- Product Layout -->
    <div class="single-product-container">
      <div class="single-product-layout">
        <!-- Media Gallery -->
        <div class="product-gallery-card">
          <div class="product-main-media">
            ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
            <img src="${product.image}" alt="${product.name}" />
          </div>
        </div>

        <!-- Purchase & Info Column -->
        <div class="product-info-column">
          <div class="product-tags-row">
            <a class="product-cat-pill" href="/category/${slugify(product.type)}" data-nav-category="${product.type}">${product.type}</a>
            ${product.brand ? `<a class="product-brand-pill" href="/category/${slugify(product.type)}/brand/${slugify(product.brand)}" data-nav-brand-category="${product.type}" data-nav-brand-name="${product.brand}">${product.brand}</a>` : ''}
          </div>

          <h1 class="single-product-title">${product.name}</h1>

          <div class="single-product-rating">
            <span class="rating-stars">★★★★★</span>
            <span><b>${rating}</b> (${reviews} verified reviews)</span>
            <span class="rating-badge">✓ Verified Authentic</span>
          </div>

          <div class="single-product-pricing">
            <span class="single-sale-price">${money(product.price)}</span>
            ${origPrice && origPrice > product.price ? `<del class="single-orig-price">${money(origPrice)}</del>` : ''}
            ${discount > 0 ? `<span class="single-discount-tag">Save ${discount}%</span>` : ''}
          </div>

          ${product.shade ? `
            <div class="product-variant-box">
              <div class="variant-title">Shade / Variant</div>
              <span class="variant-badge-active">${product.shade}</span>
            </div>
          ` : ''}

          <div class="product-qty-row">
            <div class="qty-stepper">
              <button class="qty-btn" id="qty-minus" aria-label="Decrease quantity">−</button>
              <span class="qty-val" id="qty-display">1</span>
              <button class="qty-btn" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <span style="font-size:12px;color:#27ae60;font-weight:600;">✓ In Stock — Ready to ship</span>
          </div>

          <div class="product-ctas">
            <button class="cta-add-bag" id="single-add-btn" data-product-id="${product.id}">
              <span>Add to Shopping Bag</span>
              <span>→</span>
            </button>
            <button class="cta-buy-now" id="single-buynow-btn" data-product-id="${product.id}">
              <span>Instant Buy (Cash on Delivery)</span>
              <span>⚡</span>
            </button>
          </div>

          <div class="product-perks-box">
            <div class="perk-item"><span class="perk-icon">🚚</span><span><strong>Free Delivery</strong>Across Pakistan</span></div>
            <div class="perk-item"><span class="perk-icon">💵</span><span><strong>Cash on Delivery</strong>Pay at doorstep</span></div>
            <div class="perk-item"><span class="perk-icon">📦</span><span><strong>Inspect Parcel</strong>Check before paying</span></div>
            <div class="perk-item"><span class="perk-icon">🛡️</span><span><strong>100% Original</strong>Money-back guarantee</span></div>
          </div>

          <div class="product-description-tabs">
            <h3>Product Overview</h3>
            <p>${product.description || 'A considered beauty essential, selected for your everyday ritual. Carefully formulated to deliver visible elegance and long-lasting care.'}</p>
            <a class="whatsapp-consult-btn" href="https://wa.me/923222495034?text=${encodeURIComponent(`Salam! I have a question about ${product.name} (Rs. ${product.price}).`)}" target="_blank" rel="noopener noreferrer">
              <span>Have a question? Chat on WhatsApp</span>
              <span>💬</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Related Products -->
      ${relatedProducts.length > 0 ? `
        <section class="related-products-section">
          <h2>You May Also Like</h2>
          <div class="products">
            ${relatedProducts.map(productCard).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;

  return renderStorefrontShell(productHtml);
}

/* ==========================================================================
   PAGE 5: ADMIN PANEL (No infinite loop, high performance)
   ========================================================================== */
function renderAdmin() {
  const authenticated = sessionStorage.getItem('classic-admin') === 'true';

  if (!authenticated) {
    document.querySelector('#app').innerHTML = `
      <main class="admin-login">
        <a class="logo" href="/" data-nav-home="true"><span>CLASSIC</span><em>cosmetics</em></a>
        <section>
          <p class="eyebrow">Private access</p>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your Classic Cosmetics store.</p>
          <form id="admin-login-form">
            <label>Email address<input name="email" required type="email" placeholder="admin@classiccosmetics.com" /></label>
            <label>Password<input name="password" required type="password" placeholder="••••••••" /></label>
            <p id="login-error" class="login-error" role="alert" style="color:#d9534f;font-size:12px;margin:4px 0;"></p>
            <button class="button" type="submit">Sign in <span>→</span></button>
          </form>
          <small style="display:block;margin-top:14px;color:#888;">Credentials: admin@classiccosmetics.com / Classic@2026</small>
        </section>
      </main>
    `;

    document.querySelector('#admin-login-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = form.get('email');
      const password = form.get('password');
      if (email === 'admin@classiccosmetics.com' && password === 'Classic@2026') {
        sessionStorage.setItem('classic-admin', 'true');
        renderApp();
        return;
      }
      if (supabaseConfigured) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { document.querySelector('#login-error').textContent = error.message; return; }
        sessionStorage.setItem('classic-admin', 'true');
        renderApp();
        return;
      }
      document.querySelector('#login-error').textContent = 'Email or password is incorrect.';
    });
    return;
  }

  // Admin shell
  document.querySelector('#app').innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a class="logo" href="/" data-nav-home="true"><span>CLASSIC</span><em>cosmetics</em></a>
        <p class="admin-label">Administration</p>
        <button class="admin-nav ${adminView === 'overview' ? 'active' : ''}" data-admin-view="overview">▦ Overview</button>
        <button class="admin-nav ${adminView === 'products' ? 'active' : ''}" data-admin-view="products">◈ Products <b>${products.length}</b></button>
        <button class="admin-nav ${adminView === 'categories' ? 'active' : ''}" data-admin-view="categories">◇ Categories <b>${categories.length}</b></button>
        <button class="admin-nav ${adminView === 'brands' ? 'active' : ''}" data-admin-view="brands">🏷️ Brands <b>${brands.length}</b></button>
        <button class="admin-nav ${adminView === 'sections' ? 'active' : ''}" data-admin-view="sections">▤ Sections <b>${sections.length}</b></button>
        <button class="admin-nav ${adminView === 'orders' ? 'active' : ''}" data-admin-view="orders">□ Orders <b id="admin-orders-badge">${liveOrders.length}</b></button>
        <div class="admin-spacer"></div>
        <a class="admin-nav" href="/" data-nav-home="true">↗ View storefront</a>
        <button class="admin-nav" id="admin-logout">↪ Log out</button>
      </aside>

      <main class="admin-main">
        <header class="admin-top">
          <div><p class="eyebrow">Classic Cosmetics</p><h1>Store Administration</h1></div>
          <div class="admin-actions">
            <span class="profile">CC <span>Administrator</span></span>
          </div>
        </header>

        <div id="admin-view-content">
          ${renderAdminViewContent()}
        </div>
      </main>
    </div>
  `;

  bindAdminEvents();
  initOrdersRealtimeAndPolling();
}

function renderAdminViewContent() {
  if (adminView === 'overview') {
    const revenue = liveOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    return `
      <section class="stats">
        <article><span>Revenue</span><strong>${money(revenue)}</strong><small class="up">Live tracking</small></article>
        <article><span>Orders</span><strong id="stats-orders-count">${liveOrders.length}</strong><small class="up">Orders in system</small></article>
        <article><span>Categories</span><strong>${categories.length}</strong><small>Active categories</small></article>
        <article><span>Products</span><strong>${products.length}</strong><small>In catalogue</small></article>
      </section>

      <section class="dashboard-grid">
        <article class="admin-card revenue">
          <div class="card-title"><div><p class="eyebrow">Orders Activity</p><h2>Recent overview</h2></div></div>
          <div class="chart"><div class="bars"><i style="height:40%"></i><i style="height:58%"></i><i style="height:45%"></i><i style="height:71%"></i><i style="height:59%"></i><i style="height:88%"></i><i style="height:76%"></i></div></div>
        </article>
        <article class="admin-card top-products">
          <div class="card-title"><div><p class="eyebrow">Inventory</p><h2>Featured Products</h2></div></div>
          ${products.slice(0, 4).map(p => `
            <div class="top-product">
              <img src="${p.image}" alt=""/>
              <span><strong>${p.name}</strong><small>${p.type} · ${p.brand || 'No brand'}</small></span>
              <b>${money(Number(p.price))}</b>
            </div>
          `).join('')}
        </article>
      </section>
    `;
  }

  if (adminView === 'products') {
    return `
      <section class="manager-grid">
        <article class="admin-card">
          <p class="eyebrow">Catalogue</p>
          <h2 id="product-form-title">Add product</h2>
          <form id="product-admin-form" class="manager-form product-form">
            <input type="hidden" name="index" value=""/>
            <label>Name<input name="name" required placeholder="e.g. Vitamin C Radiance Serum"/></label>
            <label>Category
              <select name="category" required id="product-cat-select">
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </label>
            <label>Brand
              <select name="brand" id="product-brand-select">
                <option value="">No brand</option>
                ${brands.map(b => `<option value="${b.name}">${b.name} (${b.category})</option>`).join('')}
              </select>
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <label>Sale Price (Rs.)<input name="price" type="number" min="0" required placeholder="2490"/></label>
              <label>Cut Price (Rs.)<input name="originalPrice" type="number" min="0" placeholder="3890"/></label>
            </div>
            <label>Shade / Variant<input name="shade" placeholder="e.g. Natural Sand, 50ml"/></label>
            <label>Image URL<input name="imageUrl" placeholder="https://images.unsplash.com/... or paste image link"/></label>
            <label>Details<textarea name="description" rows="3" placeholder="Describe the product ritual, benefits, and formulation..."></textarea></label>
            <button class="button" type="submit">Save product <span>→</span></button>
          </form>
        </article>

        <article class="admin-card">
          <p class="eyebrow">Your collection (${products.length})</p>
          <h2>Products</h2>
          <div class="manager-list product-list">
            ${products.map((p, idx) => `
              <div>
                <img src="${p.image}" alt=""/>
                <span><strong>${p.name}</strong><small>${p.type} · ${p.brand || 'No brand'} · ${money(p.price)}</small></span>
                <span>
                  <button data-edit-product="${idx}">Edit</button>
                  <button data-delete-product="${idx}" style="color:#d9534f;">Delete</button>
                </span>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    `;
  }

  if (adminView === 'categories') {
    return `
      <section class="manager-grid">
        <article class="admin-card">
          <p class="eyebrow">Shop Structure</p>
          <h2>Categories</h2>
          <form id="category-admin-form" class="manager-form">
            <input name="name" required placeholder="e.g. Body Care"/>
            <button class="button" type="submit">Add category <span>→</span></button>
          </form>
          <div class="manager-list">
            ${categories.map((c, idx) => `
              <div>
                <strong>${c}</strong>
                <span>
                  <button data-rename-category="${idx}">Rename</button>
                  <button data-delete-category="${idx}" style="color:#d9534f;">Delete</button>
                </span>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    `;
  }

  if (adminView === 'brands') {
    return `
      <section class="manager-grid">
        <article class="admin-card">
          <p class="eyebrow">Sub-Categories / Brands</p>
          <h2>Add Brand</h2>
          <form id="brand-admin-form" class="manager-form">
            <label>Category
              <select name="category" required>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </label>
            <label>Brand Name
              <input name="name" required placeholder="e.g. Garnier, Nivea, CeraVe"/>
            </label>
            <button class="button" type="submit">Add brand <span>→</span></button>
          </form>
        </article>

        <article class="admin-card">
          <p class="eyebrow">Active Brands (${brands.length})</p>
          <h2>Brand Directory</h2>
          <div class="manager-list">
            ${brands.length ? brands.map((b, idx) => `
              <div>
                <span><strong>${b.name}</strong><small>${b.category}</small></span>
                <span>
                  <button data-rename-brand="${idx}">Rename</button>
                  <button data-delete-brand="${idx}" style="color:#d9534f;">Delete</button>
                </span>
              </div>
            `).join('') : '<p class="empty-state">No brands added yet. Add a brand on the left.</p>'}
          </div>
        </article>
      </section>
    `;
  }

  // ISSUE #1: Standalone Sections Management Tab
  if (adminView === 'sections') {
    return `
      <section class="manager-grid">
        <article class="admin-card">
          <p class="eyebrow">Homepage Builder</p>
          <h2>Create New Section</h2>
          <p style="color:#777;font-size:12px;margin:0 0 16px;">Only sections created here will appear on your live homepage. You have total control.</p>
          <form id="section-admin-form" class="manager-form">
            <label>Section Title <span class="req">*</span>
              <input name="title" required placeholder="e.g. Summer Skincare Picks, Garnier Top Sellers"/>
            </label>
            <label>Subtitle / Tagline (Optional)
              <input name="subtitle" placeholder="e.g. Curated essentials for radiant summer skin"/>
            </label>
            <label>Section Type
              <select name="section_type" id="section-type-select" required>
                <option value="products_by_category">Category Showcase (Show products of a Category)</option>
                <option value="products_by_brand">Brand Spotlight (Show products of a Brand)</option>
                <option value="featured_collection">Best Sellers / All Products</option>
              </select>
            </label>
            <div id="section-cat-wrapper">
              <label>Target Category
                <select name="category" id="section-cat-field">
                  ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </label>
            </div>
            <div id="section-brand-wrapper" style="display:none;">
              <label>Target Brand
                <select name="brand" id="section-brand-field">
                  ${brands.map(b => `<option value="${b.name}">${b.name} (${b.category})</option>`).join('')}
                </select>
              </label>
            </div>
            <label>Maximum Products to Display
              <select name="max_items">
                <option value="3">3 Products</option>
                <option value="4" selected>4 Products</option>
                <option value="6">6 Products</option>
                <option value="8">8 Products</option>
              </select>
            </label>
            <button class="button" type="submit">Create section <span>→</span></button>
          </form>
        </article>

        <article class="admin-card">
          <p class="eyebrow">Configured Sections (${sections.length})</p>
          <h2>Live Sections</h2>
          <div class="manager-list">
            ${sections.length ? sections.map((sec, idx) => `
              <div class="section-item-row">
                <div class="section-item-left">
                  <strong>${sec.title}</strong>
                  <small>${sec.section_type.replace(/_/g, ' ')} · ${sec.category || sec.brand || 'All'} · Max ${sec.max_items} items</small>
                  ${sec.subtitle ? `<small style="color:#aaa;">"${sec.subtitle}"</small>` : ''}
                </div>
                <div class="section-item-actions">
                  <button class="section-status-toggle ${sec.is_active !== false ? 'status-active' : 'status-inactive'}" data-toggle-section="${idx}">
                    ${sec.is_active !== false ? '● Live' : '○ Hidden'}
                  </button>
                  <button data-delete-section="${idx}" style="color:#d9534f;">Delete</button>
                </div>
              </div>
            `).join('') : '<p class="empty-state">No custom sections added yet. Create one on the left to show it on your homepage.</p>'}
          </div>
        </article>
      </section>
    `;
  }

  if (adminView === 'orders') {
    return `
      <section class="admin-card orders-card">
        <div class="card-title">
          <div><p class="eyebrow">Realtime Order Feed</p><h2>Customer orders</h2></div>
          <button class="add-product" id="manual-refresh-orders-btn">↻ Refresh</button>
        </div>
        <div class="orders-table">
          <div class="table-head order-head">
            <span>Order / date</span>
            <span>Customer & phone</span>
            <span>Address</span>
            <span>Items</span>
            <span>Payment</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          <div id="admin-orders-list-body">
            ${renderOrderRows(liveOrders)}
          </div>
        </div>
      </section>
    `;
  }

  return '';
}

function renderOrderRows(ordersToRender) {
  if (!ordersToRender.length) {
    return `<div style="padding: 40px; text-align: center; color: #888;">No orders placed yet. Place a test order from the customer storefront.</div>`;
  }
  return ordersToRender.map(o => {
    const realId = o.id;
    const name = o.name || o.customer_name || 'Customer';
    const phone = o.phone || o.customer_phone || '—';
    const address = [o.address || o.customer_address, o.city].filter(Boolean).join(', ') || '—';
    const items = o.items?.map(i => `
      <span class="order-item">
        ${i.image ? `<img src="${i.image}" alt=""/>` : ''}
        ${i.product_name || i.name} ×${i.quantity}
      </span>
    `).join('') || '—';
    const status = o.status || 'Pending';

    return `
      <div class="order-row order-details">
        <span>
          <strong>${o.order_number || String(realId || '').slice(0, 8)}</strong>
          <small>${o.created_at ? new Date(o.created_at).toLocaleDateString('en-PK') : 'Recent'}</small>
        </span>
        <span>${name}<small>${phone}</small></span>
        <span>${address}</span>
        <span class="order-items">${items}</span>
        <span>${o.payment_method || 'COD'}</span>
        <span>${money(Number(o.total_amount || 0))}</span>
        <span>
          <select class="status-select" data-order-id="${realId}">
            ${['Pending', 'Processing', 'Confirmed', 'Delivered', 'Cancelled'].map(s => `
              <option ${s.toLowerCase() === status.toLowerCase() ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </span>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   ADMIN ACTIONS & EVENT HANDLERS
   ========================================================================== */
function bindAdminEvents() {
  // Sidebar navigation
  document.querySelectorAll('[data-admin-view]').forEach(btn => {
    btn.onclick = () => {
      adminView = btn.dataset.adminView;
      document.querySelectorAll('[data-admin-view]').forEach(b => b.classList.toggle('active', b.dataset.adminView === adminView));
      const content = document.querySelector('#admin-view-content');
      if (content) content.innerHTML = renderAdminViewContent();
      attachAdminDynamicForms();
    };
  });

  // Logout
  document.querySelector('#admin-logout')?.addEventListener('click', async () => {
    if (ordersPoller) { clearInterval(ordersPoller); ordersPoller = null; }
    if (ordersChannel && supabase) { supabase.removeChannel(ordersChannel); ordersChannel = null; }
    if (supabaseConfigured) await supabase.auth.signOut();
    sessionStorage.removeItem('classic-admin');
    renderApp();
  });

  attachAdminDynamicForms();
}

function attachAdminDynamicForms() {
  // Refresh orders button (Issue #4)
  const refreshBtn = document.querySelector('#manual-refresh-orders-btn');
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      refreshBtn.textContent = '↻ Refreshing…';
      refreshBtn.disabled = true;
      await fetchOrdersWithoutRender();
      refreshBtn.textContent = '↻ Refresh';
      refreshBtn.disabled = false;
      showToast('Orders refreshed.');
    };
  }

  // Section Type Selector Toggle
  const secTypeSelect = document.querySelector('#section-type-select');
  if (secTypeSelect) {
    secTypeSelect.onchange = () => {
      const val = secTypeSelect.value;
      const catWrap = document.querySelector('#section-cat-wrapper');
      const brandWrap = document.querySelector('#section-brand-wrapper');
      if (catWrap) catWrap.style.display = val === 'products_by_category' ? 'block' : 'none';
      if (brandWrap) brandWrap.style.display = val === 'products_by_brand' ? 'block' : 'none';
    };
  }

  // Create Section Form (Issue #1)
  const sectionForm = document.querySelector('#section-admin-form');
  if (sectionForm) {
    sectionForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(sectionForm);
      const title = fd.get('title').trim();
      const subtitle = fd.get('subtitle')?.trim() || '';
      const section_type = fd.get('section_type');
      const category = fd.get('category') || '';
      const brand = fd.get('brand') || '';
      const max_items = Number(fd.get('max_items')) || 4;

      if (!title) return;

      const newSection = {
        id: crypto.randomUUID(),
        title,
        subtitle,
        section_type,
        category,
        brand,
        max_items,
        is_active: true,
        created_at: new Date().toISOString()
      };

      if (supabaseConfigured) {
        try {
          await supabase.from('sections').insert(newSection);
        } catch (err) {
          console.warn('Supabase section save notice:', err);
        }
      }

      sections.push(newSection);
      saveAdminData();
      showToast(`Section "${title}" created and live!`);
      const content = document.querySelector('#admin-view-content');
      if (content) content.innerHTML = renderAdminViewContent();
      attachAdminDynamicForms();
    };
  }

  // Section Actions (Toggle & Delete)
  document.querySelectorAll('[data-toggle-section]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.toggleSection);
      if (sections[idx]) {
        sections[idx].is_active = sections[idx].is_active === false ? true : false;
        saveAdminData();
        const content = document.querySelector('#admin-view-content');
        if (content) content.innerHTML = renderAdminViewContent();
        attachAdminDynamicForms();
        showToast(`Section ${sections[idx].is_active ? 'activated' : 'hidden'}.`);
      }
    };
  });

  document.querySelectorAll('[data-delete-section]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.deleteSection);
      if (sections[idx] && confirm(`Delete section "${sections[idx].title}"?`)) {
        sections.splice(idx, 1);
        saveAdminData();
        const content = document.querySelector('#admin-view-content');
        if (content) content.innerHTML = renderAdminViewContent();
        attachAdminDynamicForms();
        showToast('Section deleted.');
      }
    };
  });

  // Category Admin Form
  const catForm = document.querySelector('#category-admin-form');
  if (catForm) {
    catForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = new FormData(catForm).get('name').trim();
      if (!name || categories.includes(name)) return;
      categories.push(name);
      saveAdminData();
      if (supabaseConfigured) {
        await supabase.from('categories').upsert({ name, slug: slugify(name) });
      }
      showToast(`Category "${name}" added.`);
      const content = document.querySelector('#admin-view-content');
      if (content) content.innerHTML = renderAdminViewContent();
      attachAdminDynamicForms();
    };
  }

  // Brand Admin Form
  const brandForm = document.querySelector('#brand-admin-form');
  if (brandForm) {
    brandForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(brandForm);
      const category = fd.get('category');
      const name = fd.get('name').trim();
      if (!name || brands.some(b => b.category === category && b.name.toLowerCase() === name.toLowerCase())) {
        return showToast('Brand already exists in this category.');
      }
      const newBrand = { id: crypto.randomUUID(), name, category };
      brands.push(newBrand);
      saveAdminData();
      if (supabaseConfigured) {
        const { data: catRow } = await supabase.from('categories').select('id').eq('name', category).maybeSingle();
        if (catRow) {
          await supabase.from('brands').insert({ name, slug: slugify(name), category_id: catRow.id });
        }
      }
      showToast(`Brand "${name}" added under ${category}.`);
      const content = document.querySelector('#admin-view-content');
      if (content) content.innerHTML = renderAdminViewContent();
      attachAdminDynamicForms();
    };
  }

  // Product Admin Form
  const prodForm = document.querySelector('#product-admin-form');
  if (prodForm) {
    prodForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(prodForm);
      const index = fd.get('index');
      const existing = index === '' ? null : products[Number(index)];
      const name = fd.get('name').trim();
      const type = fd.get('category');
      const brand = fd.get('brand') || '';
      const price = Number(fd.get('price'));
      const originalPrice = Number(fd.get('originalPrice')) || (price > 0 ? Math.round(price * 1.35) : 0);
      const shade = fd.get('shade') || '';
      const image = fd.get('imageUrl') || existing?.image || 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=85';
      const description = fd.get('description') || '';

      const productObj = {
        id: existing?.id || crypto.randomUUID(),
        name,
        type,
        brand,
        price,
        originalPrice,
        shade,
        image,
        description,
        rating: existing?.rating || 4.9,
        reviews: existing?.reviews || 32
      };

      if (existing) products[Number(index)] = productObj;
      else products.push(productObj);

      saveAdminData();
      showToast(`Product "${name}" saved.`);
      const content = document.querySelector('#admin-view-content');
      if (content) content.innerHTML = renderAdminViewContent();
      attachAdminDynamicForms();
    };
  }

  // Edit Product Button
  document.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.editProduct);
      const p = products[idx];
      if (!p) return;
      const form = document.querySelector('#product-admin-form');
      if (!form) return;
      form.elements.index.value = idx;
      form.elements.name.value = p.name;
      form.elements.category.value = p.type;
      form.elements.brand.value = p.brand || '';
      form.elements.price.value = p.price;
      form.elements.originalPrice.value = p.originalPrice || '';
      form.elements.shade.value = p.shade || '';
      form.elements.imageUrl.value = p.image || '';
      form.elements.description.value = p.description || '';
      document.querySelector('#product-form-title').textContent = `Edit ${p.name}`;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  // Delete Product Button
  document.querySelectorAll('[data-delete-product]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.deleteProduct);
      if (products[idx] && confirm(`Delete product "${products[idx].name}"?`)) {
        products.splice(idx, 1);
        saveAdminData();
        const content = document.querySelector('#admin-view-content');
        if (content) content.innerHTML = renderAdminViewContent();
        attachAdminDynamicForms();
        showToast('Product deleted.');
      }
    };
  });

  // Delete Brand Button
  document.querySelectorAll('[data-delete-brand]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.deleteBrand);
      if (brands[idx] && confirm(`Delete brand "${brands[idx].name}"?`)) {
        brands.splice(idx, 1);
        saveAdminData();
        const content = document.querySelector('#admin-view-content');
        if (content) content.innerHTML = renderAdminViewContent();
        attachAdminDynamicForms();
        showToast('Brand deleted.');
      }
    };
  });

  // Delete Category Button
  document.querySelectorAll('[data-delete-category]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.deleteCategory);
      if (categories[idx] && confirm(`Delete category "${categories[idx]}"?`)) {
        categories.splice(idx, 1);
        saveAdminData();
        const content = document.querySelector('#admin-view-content');
        if (content) content.innerHTML = renderAdminViewContent();
        attachAdminDynamicForms();
        showToast('Category deleted.');
      }
    };
  });

  // Status Select change
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.onchange = async () => {
      const orderId = sel.dataset.orderId;
      const newStatus = sel.value;
      const target = liveOrders.find(o => o.id === orderId);
      if (target) {
        target.status = newStatus;
        localStorage.setItem('classic-orders', JSON.stringify(liveOrders));
      }
      if (supabaseConfigured) {
        await supabase.from('orders').update({ status: newStatus, order_status: newStatus.toLowerCase() }).eq('id', orderId);
      }
      showToast(`Order status updated to ${newStatus}.`);
    };
  });
}

/* ==========================================================================
   ORDERS REALTIME & BULLETPROOF POLLING (Issue #4 & Issue #5)
   ========================================================================== */
function initOrdersRealtimeAndPolling() {
  if (isPollingActive) return; // Prevent duplicate interval loops
  isPollingActive = true;

  // Supabase Realtime channel setup
  if (supabaseConfigured && !ordersChannel) {
    ordersChannel = supabase.channel('admin-orders-realtime-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          if (!liveOrders.some(o => o.id === payload.new.id)) {
            liveOrders.unshift(payload.new);
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = liveOrders.findIndex(o => o.id === payload.new.id);
          if (idx >= 0) liveOrders[idx] = payload.new;
          else liveOrders.unshift(payload.new);
        } else if (payload.eventType === 'DELETE') {
          liveOrders = liveOrders.filter(o => o.id !== payload.old.id);
        }
        localStorage.setItem('classic-orders', JSON.stringify(liveOrders));
        patchOrdersTableDOM();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('✓ Supabase Realtime active for orders');
      });
  }

  // Background Polling Fallback (runs every 6s without blowing away the DOM)
  if (!ordersPoller) {
    ordersPoller = setInterval(() => {
      // Only poll when on admin page
      if (window.location.pathname.startsWith('/admin') && sessionStorage.getItem('classic-admin') === 'true') {
        fetchOrdersWithoutRender();
      }
    }, 6000);
  }
}

async function fetchOrdersWithoutRender() {
  // Read local storage updates first
  const local = JSON.parse(localStorage.getItem('classic-orders') || '[]');
  let updated = false;

  if (supabaseConfigured) {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const supaIds = new Set(data.map(o => o.id));
        const localOnly = local.filter(o => !o.id || !supaIds.has(o.id));
        const merged = [...localOnly, ...data];
        if (JSON.stringify(merged) !== JSON.stringify(liveOrders)) {
          liveOrders = merged;
          localStorage.setItem('classic-orders', JSON.stringify(liveOrders));
          updated = true;
        }
      }
    } catch (e) {
      console.warn('Orders fetch note:', e);
    }
  } else {
    if (JSON.stringify(local) !== JSON.stringify(liveOrders)) {
      liveOrders = local;
      updated = true;
    }
  }

  if (updated) {
    patchOrdersTableDOM();
  }
}

function patchOrdersTableDOM() {
  const badge = document.querySelector('#admin-orders-badge');
  if (badge) badge.textContent = liveOrders.length;
  const statsOrders = document.querySelector('#stats-orders-count');
  if (statsOrders) statsOrders.textContent = liveOrders.length;

  const ordersListBody = document.querySelector('#admin-orders-list-body');
  if (ordersListBody && adminView === 'orders') {
    ordersListBody.innerHTML = renderOrderRows(liveOrders);
    // Re-bind status select listeners
    ordersListBody.querySelectorAll('.status-select').forEach(sel => {
      sel.onchange = async () => {
        const orderId = sel.dataset.orderId;
        const newStatus = sel.value;
        const target = liveOrders.find(o => o.id === orderId);
        if (target) {
          target.status = newStatus;
          localStorage.setItem('classic-orders', JSON.stringify(liveOrders));
        }
        if (supabaseConfigured) {
          await supabase.from('orders').update({ status: newStatus, order_status: newStatus.toLowerCase() }).eq('id', orderId);
        }
        showToast(`Order status updated to ${newStatus}.`);
      };
    });
  }
}

/* ==========================================================================
   GLOBAL EVENT BINDINGS (Storefront Navigation, Cart, Modals)
   ========================================================================== */
function bindGlobalEvents() {
  // Cart drawer triggers
  document.querySelectorAll('.cart-trigger').forEach(btn => {
    btn.onclick = () => {
      updateCartUI();
      document.querySelector('.cart-panel')?.classList.add('open');
    };
  });

  document.querySelectorAll('.close-cart, .overlay').forEach(btn => {
    btn.onclick = () => {
      document.querySelector('.cart-panel')?.classList.remove('open');
    };
  });

  // Mobile menu
  document.querySelector('.menu-button')?.addEventListener('click', () => {
    document.querySelector('.mobile-menu')?.classList.add('open');
  });
  document.querySelector('.close-menu')?.addEventListener('click', () => {
    document.querySelector('.mobile-menu')?.classList.remove('open');
  });

  // Cart item remove
  document.querySelector('.cart-panel')?.addEventListener('click', e => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      const id = removeBtn.dataset.remove;
      cart = cart.filter(p => p.id !== id);
      saveCart();
      updateCartUI();
    }
  });

  // Checkout modal triggers
  document.querySelectorAll('.checkout').forEach(btn => {
    btn.onclick = openCheckout;
  });
  document.querySelectorAll('.close-checkout').forEach(btn => {
    btn.onclick = closeCheckout;
  });

  document.querySelector('#checkout-form')?.addEventListener('submit', submitOrder);

  // Single Product Page Qty & Buy Now handlers
  const qtyMinus = document.querySelector('#qty-minus');
  const qtyPlus = document.querySelector('#qty-plus');
  const qtyDisplay = document.querySelector('#qty-display');
  if (qtyMinus && qtyPlus && qtyDisplay) {
    let currentQty = 1;
    qtyMinus.onclick = () => {
      if (currentQty > 1) { currentQty--; qtyDisplay.textContent = currentQty; }
    };
    qtyPlus.onclick = () => {
      currentQty++; qtyDisplay.textContent = currentQty;
    };

    const addBtn = document.querySelector('#single-add-btn');
    if (addBtn) {
      addBtn.onclick = () => add(addBtn.dataset.productId, currentQty);
    }

    const buyNowBtn = document.querySelector('#single-buynow-btn');
    if (buyNowBtn) {
      buyNowBtn.onclick = () => {
        add(buyNowBtn.dataset.productId, currentQty);
        openCheckout();
      };
    }
  }

  // Quick Add Button (FAB)
  document.querySelectorAll('.quick-add-fab').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      add(btn.dataset.add);
    };
  });

  // Mobile Search Live Input
  const mobileSearch = document.querySelector('#mobile-search-input');
  if (mobileSearch) {
    mobileSearch.oninput = (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      const grid = document.querySelector('#products-grid');
      const title = document.querySelector('#shop-title');
      if (grid) {
        const filtered = searchQuery 
          ? products.filter(p => p.name.toLowerCase().includes(searchQuery) || (p.brand || '').toLowerCase().includes(searchQuery) || p.type.toLowerCase().includes(searchQuery))
          : products;
        grid.innerHTML = filtered.length 
          ? filtered.map(productCard).join('') 
          : `<div class="empty-search-state"><p>No products found for "${searchQuery}".</p></div>`;
        if (title) title.textContent = searchQuery ? `Search: "${searchQuery}"` : 'Best Sellers';
        // re-bind quick adds
        grid.querySelectorAll('.quick-add-fab').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); add(b.dataset.add); });
      }
    };
  }

  // Intercept Navigation Links for SPA smooth transitions
  document.body.onclick = (e) => {
    // Nav Home
    const homeLink = e.target.closest('[data-nav-home]');
    if (homeLink) {
      e.preventDefault();
      document.querySelector('.mobile-menu')?.classList.remove('open');
      navigate('/');
      return;
    }

    // Nav Category -> Category Page (Issue #2)
    const catLink = e.target.closest('[data-nav-category]');
    if (catLink) {
      e.preventDefault();
      document.querySelector('.mobile-menu')?.classList.remove('open');
      const category = catLink.dataset.navCategory;
      navigate(`/category/${slugify(category)}`);
      return;
    }

    // Nav Brand -> Brand Page (Issue #2)
    const brandLink = e.target.closest('[data-nav-brand-name]');
    if (brandLink) {
      e.preventDefault();
      const category = brandLink.dataset.navBrandCategory;
      const brand = brandLink.dataset.navBrandName;
      navigate(`/category/${slugify(category)}/brand/${slugify(brand)}`);
      return;
    }

    // Nav Product -> Standalone Product Page (Issue #3)
    const prodLink = e.target.closest('[data-nav-product]');
    if (prodLink) {
      e.preventDefault();
      const productId = prodLink.dataset.navProduct;
      navigate(`/product/${encodeURIComponent(productId)}`);
      return;
    }
  };
}

/* ==========================================================================
   APP RENDER DISPATCHER
   ========================================================================== */
export function renderApp() {
  const route = getRoute();

  if (route.view === 'admin') {
    renderAdmin();
    return;
  }

  if (route.view === 'product') {
    document.querySelector('#app').innerHTML = renderProductPage(route.productId);
  } else if (route.view === 'brand') {
    document.querySelector('#app').innerHTML = renderBrandPage(route.category, route.brand);
  } else if (route.view === 'category') {
    document.querySelector('#app').innerHTML = renderCategoryPage(route.category);
  } else {
    document.querySelector('#app').innerHTML = renderHomePage();
    setupPromoCarousel();
  }

  bindGlobalEvents();
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
    dot.onclick = () => goToSlide(Number(dot.dataset.slide));
  });

  if (promoTimer) clearInterval(promoTimer);
  promoTimer = setInterval(() => {
    goToSlide(promoSlideIndex + 1);
  }, 4500);
}

/* ==========================================================================
   INITIAL DATA SYNC (Supabase -> Local)
   ========================================================================== */
async function syncFromSupabase() {
  if (!supabaseConfigured) return;
  try {
    const [{ data: catData }, { data: brandData }, { data: prodData }, { data: secData }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('brands').select('*, categories(name)').order('name'),
      supabase.from('products').select('*, categories(name), brands(name)').eq('status', 'in_stock').order('created_at', { ascending: false }),
      supabase.from('sections').select('*').order('created_at')
    ]);

    if (catData?.length) categories = catData.map(c => c.name);
    if (brandData?.length) brands = brandData.map(b => ({ id: b.id, name: b.name, category: b.categories?.name || '' }));
    if (prodData?.length) {
      products = prodData.map(p => ({
        ...p,
        type: p.categories?.name || 'Uncategorized',
        brand: p.brands?.name || p.brand || '',
        image: p.images?.[0] || p.image || '',
        originalPrice: p.compare_at_price || p.original_price || (p.price ? Math.round(Number(p.price) * 1.35) : 0),
        rating: p.rating || 4.8,
        reviews: p.reviews || 28
      }));
    }
    if (secData?.length) sections = secData;
    saveAdminData();
    renderApp();
  } catch (err) {
    console.warn('Supabase catalogue sync notice:', err);
  }
}

// Boot
renderApp();
syncFromSupabase();
