import { html, render } from "lit/html.js";

const state = {
  products: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('pf_cart') || '[]'),
  filters: {
    q: '',
    category: '',
    min: null,
    max: null,
    size: null,
    sort: 'featured'
  }
};

const els = {
  productsGrid: null,
  resultsCount: null,
  search: null,
  categoryFilter: null,
  minPrice: null,
  maxPrice: null,
  sizes: null,
  sortBy: null,
  cartBtn: null,
  cartCount: null,
  cartDrawer: null,
  cartItems: null,
  cartTotal: null,
  clearFilters: null,
  modal: null,
  modalBody: null,
  modalClose: null,
  checkoutBtn: null,
  clearCart: null,
  closeCart: null,
  year: null
};

async function fetchProducts(){
  const resp = await fetch('products.json');
  const data = await resp.json();
  state.products = data;
  state.filtered = data.slice();
  populateFilters();
  applyFilters();
}

function populateFilters(){
  const cats = Array.from(new Set(state.products.map(p=>p.category))).sort();
  els.categoryFilter.innerHTML = '<option value="">Todas</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  const sizes = Array.from(new Set(state.products.flatMap(p=>p.sizes))).sort((a,b)=>a-b);
  els.sizes.innerHTML = sizes.map(s=>`<button data-size="${s}" class="size-btn">${s}</button>`).join('');
}

function applyFilters(){
  let list = state.products.slice();

  const f = state.filters;
  if(f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(p => (p.title+' '+p.description+' '+p.brand).toLowerCase().includes(q));
  }
  if(f.category) list = list.filter(p=>p.category===f.category);
  if(f.min !== null) list = list.filter(p=>p.price>=f.min);
  if(f.max !== null) list = list.filter(p=>p.price<=f.max);
  if(f.size !== null) list = list.filter(p=>p.sizes.includes(f.size));
  if(f.sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  else if(f.sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
  else if(f.sort === 'new') list.sort((a,b)=>new Date(b.added) - new Date(a.added));

  state.filtered = list;
  renderProducts();
}

function formatMoney(v){ return '€' + v.toFixed(2); }

function renderProducts(){
  els.resultsCount.textContent = state.filtered.length;
  const cards = state.filtered.map(p => html`
    <article class="card" role="article">
      <div class="media" @click=${()=>openModal(p.id)} style="cursor:pointer">
        <img src="${p.image}" alt="${p.title}" />
      </div>
      <div class="body">
        <div class="title">${p.title}</div>
        <div class="meta"><div>${p.brand}</div><div>${formatMoney(p.price)}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="muted" style="color:var(--muted);font-size:0.9rem">${p.category} • Tallas ${p.sizes.join(', ')}</div>
          <div class="actions">
            <button class="btn small secondary" @click=${()=>openModal(p.id)}>Ver</button>
            <button class="btn small primary" @click=${()=>addToCart(p.id)}>Añadir</button>
          </div>
        </div>
      </div>
    </article>
  `);
  render(html`${cards}`, els.productsGrid);
}

function openModal(id){
  const p = state.products.find(x=>x.id===id);
  els.modalBody.innerHTML = `
    <div style="display:flex;gap:12px">
      <div style="flex:1">
        <img src="${p.image}" alt="${p.title}" style="width:100%;height:360px;object-fit:cover;border-radius:8px" />
      </div>
      <aside style="width:320px">
        <h2 style="margin:0 0 8px 0">${p.title}</h2>
        <div style="color:var(--muted);margin-bottom:12px">${p.brand} • ${p.category}</div>
        <div style="font-size:1.15rem;font-weight:600;margin-bottom:12px">${formatMoney(p.price)}</div>
        <div style="margin-bottom:12px">${p.description}</div>
        <div style="margin-bottom:8px">Tallas disponibles</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${p.sizes.map(s => `<button class="btn" data-s="${s}" style="border:1px solid #e6e9ef;border-radius:8px;padding:6px 8px">${s}</button>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button id="modalAdd" class="primary">Añadir al carrito</button>
          <button id="modalCloseBtn" class="ghost">Cerrar</button>
        </div>
      </aside>
    </div>
  `;
  els.modal.classList.remove('hidden');
  // attach modal buttons (quien lo lea es gey)
  document.getElementById('modalAdd').onclick = ()=>{ addToCart(id); closeModal(); };
  document.getElementById('modalCloseBtn').onclick = closeModal;
}

function closeModal(){ els.modal.classList.add('hidden'); els.modalBody.innerHTML = ''; }

function addToCart(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  const existing = state.cart.find(i=>i.id===id);
  if(existing) existing.qty += 1;
  else state.cart.push({ id: p.id, title: p.title, price: p.price, image: p.image, qty: 1 });
  saveCart();
  openCart();
}

function saveCart(){
  localStorage.setItem('pf_cart', JSON.stringify(state.cart));
  renderCart();
}

function renderCart(){
  els.cartCount.textContent = state.cart.reduce((s,i)=>s+i.qty,0);
  els.cartItems.innerHTML = state.cart.length ? state.cart.map(item=>`
    <div class="cart-item">
      <img src="${item.image}" alt="${item.title}" />
      <div style="flex:1">
        <div style="font-weight:600">${item.title}</div>
        <div style="color:var(--muted);font-size:0.9rem">${formatMoney(item.price)}</div>
        <div class="qty" style="margin-top:8px">
          <button class="ghost" data-action="dec" data-id="${item.id}">−</button>
          <div>${item.qty}</div>
          <button class="ghost" data-action="inc" data-id="${item.id}">+</button>
          <button class="ghost" data-action="remove" data-id="${item.id}" style="margin-left:8px">Eliminar</button>
        </div>
      </div>
    </div>
  `).join('') : '<div style="padding:12px;color:var(--muted)">No hay productos en el carrito</div>';

  const total = state.cart.reduce((s,i)=>s + i.price * i.qty, 0);
  els.cartTotal.textContent = formatMoney(total);

  els.cartItems.querySelectorAll('[data-action]').forEach(btn=>{
    btn.onclick = (e)=>{
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const item = state.cart.find(x=>x.id===id);
      if(!item) return;
      if(action==='inc') item.qty++;
      else if(action==='dec'){ item.qty = Math.max(1, item.qty-1); }
      else if(action==='remove'){ state.cart = state.cart.filter(x=>x.id!==id); }
      saveCart();
    };
  });
  els.cartCount.textContent = state.cart.reduce((s,i)=>s+i.qty,0);
}

function openCart(){ els.cartDrawer.classList.remove('hidden'); renderCart(); }
function closeCart(){ els.cartDrawer.classList.add('hidden'); }

function wireUI(){
  els.productsGrid = document.getElementById('productsGrid');
  els.resultsCount = document.getElementById('resultsCount');
  els.search = document.getElementById('search');
  els.categoryFilter = document.getElementById('categoryFilter');
  els.minPrice = document.getElementById('minPrice');
  els.maxPrice = document.getElementById('maxPrice');
  els.sizes = document.getElementById('sizes');
  els.sortBy = document.getElementById('sortBy');
  els.cartBtn = document.getElementById('cartBtn');
  els.cartCount = document.getElementById('cartCount');
  els.cartDrawer = document.getElementById('cartDrawer');
  els.cartItems = document.getElementById('cartItems');
  els.cartTotal = document.getElementById('cartTotal');
  els.clearFilters = document.getElementById('clearFilters');
  els.modal = document.getElementById('modal');
  els.modalBody = document.getElementById('modalBody');
  els.modalClose = document.getElementById('modalClose');
  els.checkoutBtn = document.getElementById('checkoutBtn');
  els.clearCart = document.getElementById('clearCart');
  els.closeCart = document.getElementById('closeCart');
  els.year = document.getElementById('year');

  els.year.textContent = new Date().getFullYear();

  els.search.addEventListener('input', debounce((e)=>{
    state.filters.q = e.target.value.trim();
    applyFilters();
  }, 220));

  els.categoryFilter.addEventListener('change', e=>{
    state.filters.category = e.target.value;
    applyFilters();
  });

  els.minPrice.addEventListener('change', e=>{
    const v = parseFloat(e.target.value);
    state.filters.min = Number.isFinite(v) ? v : null;
    applyFilters();
  });
  els.maxPrice.addEventListener('change', e=>{
    const v = parseFloat(e.target.value);
    state.filters.max = Number.isFinite(v) ? v : null;
    applyFilters();
  });

  els.sizes.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-size]');
    if(!btn) return;
    const s = parseFloat(btn.getAttribute('data-size'));
    if(state.filters.size === s) state.filters.size = null;
    else state.filters.size = s;
    // toggle active styles
    document.querySelectorAll('.sizes button').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.size) === state.filters.size));
    applyFilters();
  });

  els.sortBy.addEventListener('change', e=>{
    state.filters.sort = e.target.value;
    applyFilters();
  });

  els.clearFilters.addEventListener('click', ()=>{
    state.filters = { q:'', category:'', min:null, max:null, size:null, sort:'featured' };
    els.search.value = '';
    els.categoryFilter.value = '';
    els.minPrice.value = '';
    els.maxPrice.value = '';
    document.querySelectorAll('.sizes button').forEach(b=>b.classList.remove('active'));
    els.sortBy.value = 'featured';
    applyFilters();
  });

  els.cartBtn.addEventListener('click', openCart);
  els.closeCart.addEventListener('click', closeCart);
  els.modalClose.addEventListener('click', closeModal);
  els.checkoutBtn.addEventListener('click', ()=> alert('Simulación de pago — implementación real aquí.'));
  els.clearCart.addEventListener('click', ()=>{
    state.cart = [];
    saveCart();
  });

  els.modal.addEventListener('click', (e)=>{ if(e.target === els.modal) closeModal(); });

  renderCart();
}

function debounce(fn, ms=200){
  let t;
  return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}

// Initialize
document.addEventListener('DOMContentLoaded', ()=>{
  wireUI();
  fetchProducts();
});
