async function loadProducts(container='#products'){
  const el = document.querySelector(container);
  if(!el) return;
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    el.innerHTML = '';
    for(const p of products){
      const d = document.createElement('div');
      d.className='card';
      d.innerHTML = `<h3>${p.name}</h3><p>${p.description||''}</p><p>${p.price} ${p.currency}</p><p><a href="/product.html?sku=${encodeURIComponent(p.sku)}">View</a> <button data-sku="${p.sku}" data-name="${p.name}" data-price="${p.price}" class="add-btn">Add</button></p>`;
      el.appendChild(d);
    }
    document.querySelectorAll('.add-btn').forEach(btn=>btn.addEventListener('click', e=>{
      const sku = btn.dataset.sku, name=btn.dataset.name, price=btn.dataset.price;
      const cart = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
      const found = cart.find(i=>i.sku===sku);
      if(found) found.qty++;
      else cart.push({ sku, name, qty:1, unit_price: price, unit_price_cents: Math.round(parseFloat(price)*100), currency: 'GBP' });
      localStorage.setItem('gxuz_cart', JSON.stringify(cart));
      updateCartCount();
      alert('Added to cart');
    }));
    updateCartCount();
  } catch (e) {
    console.error(e);
    el.innerHTML = '<p>Failed to load products</p>';
  }
}
function updateCartCount(){
  const c = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
  const total = c.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(n=>n.innerText = total);
}
document.addEventListener('DOMContentLoaded', ()=>loadProducts());
