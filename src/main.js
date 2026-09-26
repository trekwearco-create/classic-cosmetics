import './style.css';

const products = [
  { id: 'rose-serum', name: 'Rose Renewal Serum', type: 'Skincare', price: 2490, shade: 'rose', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=85' },
  { id: 'silk-foundation', name: 'Silk Veil Foundation', type: 'Makeup', price: 1890, shade: 'sand', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=85' },
  { id: 'gold-elixir', name: 'Golden Glow Elixir', type: 'Skincare', price: 2790, shade: 'gold', image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=700&q=85' },
  { id: 'velvet-lip', name: 'Velvet Petal Lip Color', type: 'Makeup', price: 1290, shade: 'berry', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=85' },
  { id: 'midnight-musk', name: 'Midnight Musk Eau de Parfum', type: 'Fragrance', price: 3490, shade: 'ink', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=85' },
  { id: 'botanical-wash', name: 'Botanical Cleansing Balm', type: 'Bath & Body', price: 1590, shade: 'leaf', image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=700&q=85' }
];

let cart = JSON.parse(localStorage.getItem('classic-cart') || '[]');
const money = value => `Rs. ${value.toLocaleString('en-PK')}`;
const save = () => localStorage.setItem('classic-cart', JSON.stringify(cart));
const cartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
const cartTotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

function productCard(product) {
  return `<article class="product-card"><button class="product-image" data-product="${product.id}" aria-label="View ${product.name}"><img src="${product.image}" alt="${product.name}" loading="lazy" /></button><div class="product-meta"><span>${product.type}</span><h3>${product.name}</h3><div class="price-row"><strong>${money(product.price)}</strong><button class="mini-add" data-add="${product.id}" aria-label="Add ${product.name} to cart">+</button></div></div></article>`;
}

function render() {
  document.querySelector('#app').innerHTML = `
    <div class="announcement"><span>✦ 100% Genuine Products</span><span class="desktop-only">Free delivery on prepaid orders</span><span class="desktop-only">Easy returns, always</span></div>
    <header><button class="menu-button" aria-label="Open navigation">☰</button><a class="logo" href="#top"><span>CLASSIC</span><em>cosmetics</em></a><nav><a href="#shop">Shop</a><a href="#rituals">Collections</a><a href="#story">Our Story</a><a href="#contact">Contact</a></nav><div class="header-actions"><button aria-label="Search">⌕</button><button aria-label="Account">♙</button><button class="cart-trigger" aria-label="Open cart">Bag <b>${cartCount()}</b></button></div></header>
    <main id="top">
      <section class="hero"><div class="hero-copy"><p class="eyebrow">The art of everyday beauty</p><h1>Radiance, made<br /><i>ritual.</i></h1><p class="hero-text">Considered essentials for your most luminous self. Discover beauty that feels like care.</p><a class="button" href="#shop">Shop the collection <span>→</span></a></div><div class="hero-art"><div class="sun"></div><div class="arch"></div><img src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=90" alt="Classic beauty collection" /><p class="vertical-label">EST. 2024 · PAKISTAN</p></div></section>
      <section class="trust"><div><b>✦</b><span><strong>Curated with care</strong>Authentic beauty, thoughtfully chosen</span></div><div><b>◌</b><span><strong>Made for you</strong>Every tone. Every ritual. Every day.</span></div><div><b>⌁</b><span><strong>Delivered beautifully</strong>Across Pakistan, at your doorstep</span></div></section>
      <section class="categories" id="rituals"><div class="section-heading"><p class="eyebrow">Explore by ritual</p><h2>Beauty, your way</h2></div><div class="category-grid"><a href="#shop"><span class="cat-number">01</span><strong>Skincare</strong><i>Reveal your glow</i></a><a href="#shop"><span class="cat-number">02</span><strong>Makeup</strong><i>Express your mood</i></a><a href="#shop"><span class="cat-number">03</span><strong>Fragrance</strong><i>Leave a little magic</i></a><a href="#shop"><span class="cat-number">04</span><strong>Bath & Body</strong><i>Indulge slowly</i></a></div></section>
      <section class="featured" id="shop"><div class="section-heading row-heading"><div><p class="eyebrow">Just for you</p><h2>Most loved</h2></div><button class="text-link" id="view-all">View all products →</button></div><div class="products">${products.map(productCard).join('')}</div></section>
      <section class="editorial" id="story"><div class="editorial-image"><img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=90" alt="Woman applying skincare" /></div><div class="editorial-copy"><p class="eyebrow">Our philosophy</p><h2>Beauty should feel<br /><i>like a pause.</i></h2><p>We believe the small moments you give yourself matter most. Classic Cosmetics brings together refined, effective beauty to turn the everyday into a personal ritual.</p><a class="text-link" href="#contact">Meet Classic Cosmetics →</a></div></section>
      <section class="reviews"><p class="eyebrow">Kind words</p><blockquote>“The packaging, the products, the whole experience — it feels like a little luxury delivered to my door.”</blockquote><div class="stars">★★★★★</div><p>— AREEBA K., LAHORE</p></section>
      <section class="newsletter" id="contact"><div><p class="eyebrow">A note from us</p><h2>Be first to know</h2><p>New arrivals, quiet offers and beauty notes — just the lovely bits.</p></div><form id="newsletter-form"><input type="email" required placeholder="Your email address" aria-label="Email address" /><button class="button" type="submit">Subscribe <span>→</span></button></form></section>
    </main>
    <footer><a class="logo" href="#top"><span>CLASSIC</span><em>cosmetics</em></a><div><strong>Explore</strong><a href="#shop">Shop all</a><a href="#rituals">Collections</a><a href="#story">Our story</a></div><div><strong>Customer care</strong><a href="#contact">Contact us</a><a href="#">Delivery & returns</a><a href="#">Privacy policy</a></div><p>© 2026 Classic Cosmetics.<br />Elegance in every detail.</p></footer>
    <a class="whatsapp" href="https://wa.me/923222495034?text=Hi%2C%20I%20have%20a%20question%20about%20a%20product" target="_blank" rel="noopener noreferrer" aria-label="Chat with Classic Cosmetics on WhatsApp">◔</a>
    <aside class="cart-panel ${cart.length ? 'open' : ''}"><div class="cart-head"><h2>Your bag</h2><button class="close-cart" aria-label="Close cart">×</button></div>${cart.length ? `<div class="cart-items">${cart.map(item => `<div class="cart-item"><img src="${item.image}" alt="" /><div><span>${item.type}</span><strong>${item.name}</strong><small>${money(item.price)} × ${item.quantity}</small></div><button data-remove="${item.id}" aria-label="Remove ${item.name}">×</button></div>`).join('')}</div><div class="cart-footer"><p><span>Subtotal</span><strong>${money(cartTotal())}</strong></p><button class="button checkout">Secure checkout <span>→</span></button><small>Cash on delivery available</small></div>` : `<div class="empty-cart"><p>Your bag is waiting for a little beauty.</p><button class="button close-cart">Continue shopping</button></div>`}</aside>
    <div class="overlay"></div><div class="toast" role="status"></div>`;
  bindEvents();
}

function showToast(text) { const toast = document.querySelector('.toast'); toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function add(id) { const product = products.find(p => p.id === id); const line = cart.find(p => p.id === id); line ? line.quantity++ : cart.push({ ...product, quantity: 1 }); save(); render(); document.querySelector('.cart-panel').classList.add('open'); showToast(`${product.name} added to your bag`); }
function bindEvents() {
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => add(button.dataset.add));
  document.querySelector('.cart-trigger').onclick = () => document.querySelector('.cart-panel').classList.add('open');
  document.querySelectorAll('.close-cart, .overlay').forEach(button => button.onclick = () => document.querySelector('.cart-panel').classList.remove('open'));
  document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => { cart = cart.filter(p => p.id !== button.dataset.remove); save(); render(); document.querySelector('.cart-panel').classList.add('open'); });
  document.querySelectorAll('[data-product]').forEach(button => button.onclick = () => add(button.dataset.product));
  document.querySelector('#newsletter-form').onsubmit = event => { event.preventDefault(); event.target.reset(); showToast('Welcome to the Classic circle.'); };
  document.querySelector('.checkout')?.addEventListener('click', () => showToast('Checkout connects to Supabase when environment keys are added.'));
}
const orders = [
  { no: 'CC-2026092601', name: 'Areeba Khan', amount: 5280, payment: 'COD', status: 'Pending', time: '12 min ago' },
  { no: 'CC-2026092598', name: 'Sara Ahmed', amount: 3490, payment: 'EasyPaisa', status: 'Processing', time: '1 hr ago' },
  { no: 'CC-2026092596', name: 'Hina Malik', amount: 4670, payment: 'JazzCash', status: 'Confirmed', time: '3 hrs ago' },
  { no: 'CC-2026092591', name: 'Maham Ali', amount: 2490, payment: 'COD', status: 'Delivered', time: 'Yesterday' }
];

function renderAdmin() {
  const authenticated = sessionStorage.getItem('classic-admin') === 'true';
  document.querySelector('#app').innerHTML = authenticated ? `<div class="admin-shell">
    <aside class="admin-sidebar"><a class="logo" href="/"><span>CLASSIC</span><em>cosmetics</em></a><p class="admin-label">Administration</p><button class="admin-nav active">▦ Overview</button><button class="admin-nav">◈ Products <b>24</b></button><button class="admin-nav">□ Orders <b>4</b></button><button class="admin-nav">◔ Analytics</button><div class="admin-spacer"></div><a class="admin-nav" href="/">↗ View storefront</a><button class="admin-nav" id="logout">↪ Log out</button></aside>
    <main class="admin-main"><header class="admin-top"><div><p class="eyebrow">Friday, 26 September</p><h1>Good morning, Classic.</h1></div><div class="admin-actions"><button class="notification">♧<b>4</b></button><button class="profile">CC <span>Administrator</span>⌄</button></div></header>
      <section class="stats"><article><span>Today's revenue</span><strong>Rs. 18,420</strong><small class="up">↑ 12.5% from yesterday</small></article><article><span>Orders today</span><strong>12</strong><small class="up">↑ 3 more than yesterday</small></article><article><span>Pending orders</span><strong>4</strong><small>Require your attention</small></article><article><span>Average order</span><strong>Rs. 3,185</strong><small class="up">↑ 8.2% this week</small></article></section>
      <section class="dashboard-grid"><article class="admin-card revenue"><div class="card-title"><div><p class="eyebrow">Performance</p><h2>Revenue overview</h2></div><select><option>Last 7 days</option></select></div><div class="chart"><div class="bars"><i style="height:40%"></i><i style="height:58%"></i><i style="height:45%"></i><i style="height:71%"></i><i style="height:59%"></i><i style="height:88%"></i><i style="height:76%"></i></div><div class="chart-labels"><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Today</span></div></div></article><article class="admin-card top-products"><div class="card-title"><div><p class="eyebrow">This month</p><h2>Best sellers</h2></div><button class="text-link">View all</button></div>${products.slice(0,3).map((p,i)=>`<div class="top-product"><img src="${p.image}" alt=""/><span><strong>${p.name}</strong><small>${35-i*7} sold</small></span><b>${money(p.price*(35-i*7))}</b></div>`).join('')}</article></section>
      <section class="admin-card orders-card"><div class="card-title"><div><p class="eyebrow">Live order feed</p><h2>Recent orders</h2></div><button class="add-product">+ Add product</button></div><div class="orders-table"><div class="table-head"><span>Order</span><span>Customer</span><span>Payment</span><span>Total</span><span>Status</span><span></span></div>${orders.map(o=>`<div class="order-row"><span><strong>${o.no}</strong><small>${o.time}</small></span><span>${o.name}</span><span>${o.payment}</span><span>${money(o.amount)}</span><span><b class="status ${o.status.toLowerCase()}">${o.status}</b></span><button class="row-menu">•••</button></div>`).join('')}</div></section>
    </main></div>` : `<main class="admin-login"><a class="logo" href="/"><span>CLASSIC</span><em>cosmetics</em></a><section><p class="eyebrow">Private access</p><h1>Welcome back.</h1><p>Sign in to manage your Classic Cosmetics store.</p><form id="admin-login"><label>Email address<input required type="email" placeholder="you@classiccosmetics.com" /></label><label>Password<input required type="password" placeholder="••••••••" /></label><button class="button" type="submit">Sign in <span>→</span></button></form><small>Demo mode: use any email and password. Connect Supabase Auth for production access.</small></section></main>`;
  document.querySelector('#admin-login')?.addEventListener('submit', event => { event.preventDefault(); sessionStorage.setItem('classic-admin', 'true'); renderAdmin(); });
  document.querySelector('#logout')?.addEventListener('click', () => { sessionStorage.removeItem('classic-admin'); renderAdmin(); });
}

window.location.pathname.startsWith('/admin') ? renderAdmin() : render();
