document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('checkout');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const email = document.getElementById('email').value;
    const provider = document.getElementById('provider').value;
    const cart = JSON.parse(localStorage.getItem('gxuz_cart')||'[]');
    if (!email) return alert('Enter email');
    if (cart.length===0) return alert('Cart empty');
    const items = cart.map(i=>({ sku: i.sku, qty: i.qty, unit_price_cents: i.unit_price_cents, currency: i.currency || 'GBP' }));
    const res = await fetch('/api/cart/checkout', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, items, provider })
    });
    const data = await res.json();
    if (data.url) {
      // redirect to payment provider
      window.location = data.url;
    } else if (data.invoice) {
      // completed (dev) - clear cart and go to success
      localStorage.removeItem('gxuz_cart');
      window.location = data.invoice;
    } else if (data.order_number) {
      localStorage.removeItem('gxuz_cart');
      window.location = '/success.html?order='+data.order_number;
    } else {
      alert(JSON.stringify(data));
    }
  });
});
