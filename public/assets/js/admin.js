document.addEventListener('DOMContentLoaded', ()=>{
  const loginBtn = document.getElementById('login');
  if(loginBtn) loginBtn.addEventListener('click', async ()=>{
    const u = document.getElementById('u').value, p = document.getElementById('p').value;
    const res = await fetch('/admin/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: u, password: p })});
    if(res.ok){ document.getElementById('login-form').style.display='none'; document.getElementById('admin-area').style.display='block'; loadKeys(); }
    else alert('Login failed');
  });
  const uploadBtn = document.getElementById('upload-keys');
  if(uploadBtn) uploadBtn.addEventListener('click', async ()=>{
    const f = document.getElementById('keysfile').files[0];
    if(!f) return alert('Choose CSV');
    const form = new FormData(); form.append('keys', f);
    const res = await fetch('/admin/upload-keys', { method:'POST', body: form });
    const data = await res.json();
    alert('Imported: '+ (data.imported||0));
    loadKeys();
  });
  const addBtn = document.getElementById('add-product');
  if(addBtn) addBtn.addEventListener('click', async ()=>{
    const sku = document.getElementById('sku').value, name = document.getElementById('name').value, price = document.getElementById('price').value, currency = document.getElementById('currency').value;
    const res = await fetch('/admin/add-product', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sku,name,price,currency }) });
    const j = await res.json();
    if (j.ok) alert('Product added'); else alert(JSON.stringify(j));
  });
  async function loadKeys(){
    const res = await fetch('/admin/keys');
    if(res.status===401) return;
    const keys = await res.json();
    document.getElementById('keys-list').innerText = keys.map(k=>`${k.id} ${k.sku} ${k.used?'USED':'UNUSED'} ${k.key_value}`).join('\n');
  }
});
