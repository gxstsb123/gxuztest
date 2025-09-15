function renderCart(){
  const cart = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
  const container = document.getElementById('cart-items');
  if(!container) return;
  container.innerHTML = '';
  if(cart.length===0){ container.innerHTML='<p>Cart empty</p>'; return; }
  cart.forEach((it, idx)=>{
    const div = document.createElement('div');
    div.className='card';
    div.innerHTML = `<strong>${it.name}</strong> <br>Qty: <input data-idx="${idx}" class="qty" type="number" value="${it.qty}" min="1"> Unit: ${it.unit_price} ${it.currency} <button data-idx="${idx}" class="rm">Remove</button>`;
    container.appendChild(div);
  });
  document.querySelectorAll('.qty').forEach(input=>input.addEventListener('change', e=>{
    const idx = parseInt(e.target.dataset.idx); const cart = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
    cart[idx].qty = parseInt(e.target.value) || 1;
    localStorage.setItem('gxuz_cart', JSON.stringify(cart));
    renderCart(); updateSummary();
  }));
  document.querySelectorAll('.rm').forEach(b=>b.addEventListener('click', e=>{
    const idx = parseInt(e.target.dataset.idx); const cart = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
    cart.splice(idx,1); localStorage.setItem('gxuz_cart', JSON.stringify(cart)); renderCart(); updateSummary();
  }));
  updateSummary();
}
function updateSummary(){
  const cart = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
  const sum = cart.reduce((s,i)=>s + (i.unit_price_cents * i.qty), 0);
  const el = document.getElementById('cart-summary');
  if(el) el.innerHTML = `<p>Total: £${(sum/100).toFixed(2)}</p>`;
  document.querySelectorAll('#cart-count').forEach(n=>n.innerText = cart.reduce((s,i)=>s+i.qty,0));
}
document.addEventListener('DOMContentLoaded', ()=>renderCart());
