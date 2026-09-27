import './style.css';
import './checkout.css';
import './admin-management.css';
import { supabase, supabaseConfigured } from './supabase.js';

let products = [
  { id: 'rose-serum', name: 'Rose Renewal Serum', type: 'Skincare', price: 2490, shade: 'rose', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=85' },
  { id: 'silk-foundation', name: 'Silk Veil Foundation', type: 'Makeup', price: 1890, shade: 'sand', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=85' },
  { id: 'gold-elixir', name: 'Golden Glow Elixir', type: 'Skincare', price: 2790, shade: 'gold', image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=700&q=85' },
  { id: 'velvet-lip', name: 'Velvet Petal Lip Color', type: 'Makeup', price: 1290, shade: 'berry', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=85' },
  { id: 'midnight-musk', name: 'Midnight Musk Eau de Parfum', type: 'Fragrance', price: 3490, shade: 'ink', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=85' },
  { id: 'botanical-wash', name: 'Botanical Cleansing Balm', type: 'Bath & Body', price: 1590, shade: 'leaf', image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=700&q=85' }
];

let cart = JSON.parse(localStorage.getItem('classic-cart') || '[]');
let liveOrders = [];
let ordersLoaded = false;
let ordersChannel = null;
let ordersPoller = null;
let catalogueChannel = null;
const money = value => `Rs. ${value.toLocaleString('en-PK')}`;
const save = () => localStorage.setItem('classic-cart', JSON.stringify(cart));
const cartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
const cartTotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

function productCard(product) {
  return `<article class="product-card"><button class="product-image" data-details="${product.id}" aria-label="View ${product.name}"><img src="${product.image}" alt="${product.name}" loading="lazy" /></button><div class="product-meta"><span>${product.type}</span><h3>${product.name}</h3><div class="price-row"><strong>${money(Number(product.price))}</strong><button class="mini-add" data-add="${product.id}" aria-label="Add ${product.name} to cart">Add</button></div></div></article>`;
}

function render() {
  document.querySelector('#app').innerHTML = `
    <div class="announcement"><span>✦ 100% Genuine Products</span><span class="desktop-only">Free delivery on prepaid orders</span><span class="desktop-only">Easy returns, always</span></div>
    <header><button class="menu-button" aria-label="Open navigation">☰</button><a class="logo" href="#top"><span>CLASSIC</span><em>cosmetics</em></a><nav><a href="#shop">Shop</a>${categories.map(category=>`<a href="#shop" data-category-link="${category}">${category}</a>`).join('')}<a href="#contact">Contact</a></nav><div class="header-actions"><button aria-label="Search">⌕</button><button aria-label="Account">♙</button><button class="cart-trigger" aria-label="Open cart">Bag <b>${cartCount()}</b></button></div></header><aside class="mobile-menu"><button class="close-menu" aria-label="Close menu">×</button><p class="eyebrow">Explore</p><a href="#shop">Shop all</a>${categories.map(category=>`<a href="#shop" data-category-link="${category}">${category}</a>`).join('')}<a href="#story">Our story</a><a href="#contact">Contact</a></aside>
    <main id="top">
      <section class="hero"><div class="hero-copy"><p class="eyebrow">The art of everyday beauty</p><h1>Radiance, made<br /><i>ritual.</i></h1><p class="hero-text">Considered essentials for your most luminous self. Discover beauty that feels like care.</p><a class="button" href="#shop">Shop the collection <span>→</span></a></div><div class="hero-art"><div class="sun"></div><div class="arch"></div><img src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=90" alt="Classic beauty collection" /><p class="vertical-label">EST. 2024 · PAKISTAN</p></div></section>
      <section class="trust"><div><b>✦</b><span><strong>Curated with care</strong>Authentic beauty, thoughtfully chosen</span></div><div><b>◌</b><span><strong>Made for you</strong>Every tone. Every ritual. Every day.</span></div><div><b>⌁</b><span><strong>Delivered beautifully</strong>Across Pakistan, at your doorstep</span></div></section>
      <section class="categories" id="rituals"><div class="section-heading"><p class="eyebrow">Explore by ritual</p><h2>Beauty, your way</h2></div><div class="category-grid">${categories.map((category,index)=>`<a href="#shop" data-category-link="${category}"><span class="cat-number">${String(index+1).padStart(2,'0')}</span><strong>${category}</strong><i>Discover the collection</i></a>`).join('')}</div></section>
      <section class="featured" id="shop"><div class="section-heading row-heading"><div><p class="eyebrow">Just for you</p><h2 id="shop-title">Most loved</h2></div><button class="text-link" id="view-all">View all products →</button></div><div class="products">${products.map(productCard).join('')}</div></section>
      <section class="editorial" id="story"><div class="editorial-image"><img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=90" alt="Woman applying skincare" /></div><div class="editorial-copy"><p class="eyebrow">Our philosophy</p><h2>Beauty should feel<br /><i>like a pause.</i></h2><p>We believe the small moments you give yourself matter most. Classic Cosmetics brings together refined, effective beauty to turn the everyday into a personal ritual.</p><a class="text-link" href="#contact">Meet Classic Cosmetics →</a></div></section>
      <section class="reviews"><p class="eyebrow">Kind words</p><blockquote>“The packaging, the products, the whole experience — it feels like a little luxury delivered to my door.”</blockquote><div class="stars">★★★★★</div><p>— AREEBA K., LAHORE</p></section>
      <section class="newsletter" id="contact"><div><p class="eyebrow">A note from us</p><h2>Be first to know</h2><p>New arrivals, quiet offers and beauty notes — just the lovely bits.</p></div><form id="newsletter-form"><input type="email" required placeholder="Your email address" aria-label="Email address" /><button class="button" type="submit">Subscribe <span>→</span></button></form></section>
    </main>
    <footer><a class="logo" href="#top"><span>CLASSIC</span><em>cosmetics</em></a><div><strong>Explore</strong><a href="#shop">Shop all</a><a href="#rituals">Collections</a><a href="#story">Our story</a></div><div><strong>Customer care</strong><a href="#contact">Contact us</a><a href="#">Delivery & returns</a><a href="#">Privacy policy</a></div><p>© 2026 Classic Cosmetics.<br />Elegance in every detail.</p></footer>
    <a class="whatsapp" href="https://wa.me/923222495034?text=Hi%2C%20I%20have%20a%20question%20about%20a%20product" target="_blank" rel="noopener noreferrer" aria-label="Chat with Classic Cosmetics on WhatsApp">◔</a>
    <aside class="cart-panel ${cart.length ? 'open' : ''}"><div class="cart-head"><h2>Your bag</h2><button class="close-cart" aria-label="Close cart">×</button></div>${cart.length ? `<div class="cart-items">${cart.map(item => `<div class="cart-item"><img src="${item.image}" alt="" /><div><span>${item.type}</span><strong>${item.name}</strong><small>${money(item.price)} × ${item.quantity}</small></div><button data-remove="${item.id}" aria-label="Remove ${item.name}">×</button></div>`).join('')}</div><div class="cart-footer"><p><span>Subtotal</span><strong>${money(cartTotal())}</strong></p><button class="button checkout">Secure checkout <span>→</span></button><small>Cash on delivery available</small></div>` : `<div class="empty-cart"><p>Your bag is waiting for a little beauty.</p><button class="button close-cart">Continue shopping</button></div>`}</aside>
    <div class="checkout-modal" aria-hidden="true"><div class="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button class="close-checkout" aria-label="Close checkout">×</button><p class="eyebrow">Almost yours</p><h2 id="checkout-title">Delivery details</h2><p class="checkout-summary">${cartCount()} item${cartCount() === 1 ? '' : 's'} · <strong>${money(cartTotal())}</strong></p><form id="checkout-form"><label>Full name<input name="name" required autocomplete="name" /></label><label>Phone number<input name="phone" type="tel" required autocomplete="tel" /></label><label>Delivery address<textarea name="address" required rows="3" autocomplete="street-address"></textarea></label><div class="checkout-row"><label>City<input name="city" required autocomplete="address-level2" /></label><label>Payment method<select name="payment_method" required><option value="cod">Cash on Delivery</option><option value="easypaisa">EasyPaisa</option><option value="jazzcash">JazzCash</option><option value="card">Credit / Debit Card</option></select></label></div><button class="button" type="submit">Place order <span>→</span></button></form></div></div><div class="overlay"></div><div class="toast" role="status"></div>`;
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
  document.querySelectorAll('[data-details]').forEach(button => button.onclick = () => showProductDetails(button.dataset.details));
  document.querySelector('.menu-button').onclick = () => document.querySelector('.mobile-menu').classList.add('open');
  document.querySelector('.close-menu').onclick = () => document.querySelector('.mobile-menu').classList.remove('open');
  document.querySelectorAll('[data-category-link]').forEach(link => link.onclick = () => {
    const category = link.dataset.categoryLink;
    document.querySelector('.mobile-menu').classList.remove('open');
    const filtered = products.filter(product => product.type === category);
    document.querySelector('#shop-title').textContent = category;
    document.querySelector('.products').innerHTML = (filtered.length ? filtered : products).map(productCard).join('');
    document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => add(button.dataset.add));
    document.querySelectorAll('[data-details]').forEach(button => button.onclick = () => showProductDetails(button.dataset.details));
  });
  document.querySelector('#view-all').onclick = () => { document.querySelector('#shop-title').textContent = 'Most loved'; document.querySelector('.products').innerHTML = products.map(productCard).join(''); bindEvents(); };
  document.querySelector('#newsletter-form').onsubmit = event => { event.preventDefault(); event.target.reset(); showToast('Welcome to the Classic circle.'); };
  document.querySelector('.checkout')?.addEventListener('click', () => document.querySelector('.checkout-modal').classList.add('open'));
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
  if (productData?.length) products = productData.map(product => ({ ...product, type: product.categories?.name || 'Uncategorized', image: product.images?.[0] || '' }));
  render();
}

function subscribeToCatalogue() {
  if (!supabaseConfigured || catalogueChannel) return;
  catalogueChannel = supabase.channel('storefront-catalogue-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, hydrateStorefront)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, hydrateStorefront)
    .subscribe();
}

function closeCheckout() { document.querySelector('.checkout-modal')?.classList.remove('open'); }

async function submitOrder(event) {
  event.preventDefault();
  if (!cart.length) return showToast('Your bag is empty.');
  if (!supabaseConfigured) return showToast('Checkout connects to Supabase when environment keys are added.');
  const form = new FormData(event.currentTarget);
  const order = {
    order_number: `CC-${Date.now()}`,
    name: form.get('name'), customer_name: form.get('name'),
    phone: form.get('phone'), customer_phone: form.get('phone'),
    address: form.get('address'), customer_address: form.get('address'),
    city: form.get('city'), payment_method: form.get('payment_method'),
    items: cart.map(({ id, name, price, quantity, image }) => ({ product_id: id, product_name: name, unit_price: price, quantity, image })),
    total_amount: cartTotal(), status: 'Pending', order_status: 'pending'
  };
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Placing order…';
  const { error } = await supabase.from('orders').insert(order);
  button.disabled = false; button.innerHTML = 'Place order <span>→</span>';
  if (error) return showToast(`Could not place order: ${error.message}`);
  cart = []; save(); closeCheckout(); render(); showToast('Order placed successfully!');
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
      ${adminView==='products'?`<section class="manager-grid"><article class="admin-card"><p class="eyebrow">Catalogue</p><h2 id="product-form-title">Add product</h2><form id="product-form" class="manager-form product-form"><input type="hidden" name="index" value=""/><label>Name<input name="name" required/></label><label>Category<select name="category" required>${categories.map(c=>`<option>${c}</option>`).join('')}</select></label><label>Price<input name="price" type="number" min="0" required/></label><label>Shade / variant<input name="shade"/></label><label>Product image<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required/><small class="file-hint">Choose from your device. It uploads to the secure product-images bucket.</small></label><label>Details<textarea name="description" rows="3"></textarea></label><button class="button">Save product <span>→</span></button></form></article><article class="admin-card"><p class="eyebrow">Your collection</p><h2>Products</h2><div class="manager-list product-list">${managedProducts.map((product,index)=>`<div><img src="${product.image}" alt=""/><span><strong>${product.name}</strong><small>${product.type} · ${money(Number(product.price))}</small></span><span><button data-edit-product="${index}">Edit</button><button data-delete-product="${index}">Delete</button></span></div>`).join('')}</div></article></section>`:''}
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
    if (button.dataset.editProduct !== undefined) { const product = managedProducts[Number(button.dataset.editProduct)]; const form = document.querySelector('#product-form'); form.elements.imageFile.required = false; Object.entries({ index: button.dataset.editProduct, name: product.name, category: product.type, price: product.price, shade: product.shade || '', description: product.description || '' }).forEach(([key, value]) => { form.elements[key].value = value; }); if (form.elements.brand) { form.elements.brand.innerHTML = `<option value="">No brand</option>${brands.filter(brand => brand.category === product.type).map(brand => `<option value="${brand.name}">${brand.name}</option>`).join('')}`; form.elements.brand.value = product.brand || ''; } document.querySelector('#product-form-title').textContent = `Edit ${product.name}`; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
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
    const product = { id: existing?.id || crypto.randomUUID(), name: form.get('name'), type: form.get('category'), brand: form.get('brand') || '', price: Number(form.get('price')), shade: form.get('shade'), description: form.get('description'), image };
    if (supabaseConfigured) { const [{ data: category }, { data: brand }] = await Promise.all([supabase.from('categories').select('id').eq('name', product.type).maybeSingle(), product.brand ? supabase.from('brands').select('id').eq('name', product.brand).maybeSingle() : Promise.resolve({ data: null })]); const payload = { name: product.name, description: product.description, category_id: category?.id || null, brand_id: brand?.id || null, price: product.price, stock: 1, status: 'in_stock', images: [product.image] }; const request = existing ? supabase.from('products').update(payload).eq('id', product.id).select().single() : supabase.from('products').insert(payload).select().single(); const { data, error } = await request; if (error) return showToast(`Product save failed: ${error.message}`); product.id = data.id; }
    if (existing) managedProducts[Number(index)] = product; else managedProducts.push(product); products = managedProducts; saveAdminData(); renderAdmin(); showToast('Product saved.');
  });
  mountBrandControls();
  if (authenticated && supabaseConfigured) { subscribeToOrders(); startOrdersPolling(); if (!ordersLoaded && (adminView === 'overview' || adminView === 'orders')) fetchOrders(); if (!managementLoaded && (adminView === 'products' || adminView === 'categories')) syncManagementData(); }
}

if (window.location.pathname.startsWith('/admin')) renderAdmin(); else { render(); hydrateStorefront(); subscribeToCatalogue(); }
