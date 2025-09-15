const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse/lib/sync');
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_URL || './prodkeys.db');
const upload = multer({ dest: 'tmp/' });

// Simple admin middleware
function requireAdmin(req,res,next){
  if (req.session && req.session.isAdmin) return next();
  // try basic auth with env creds as fallback
  const u = process.env.ADMIN_USERNAME, p = process.env.ADMIN_PASSWORD;
  if (req.headers.authorization) {
    const b = Buffer.from(req.headers.authorization.split(' ')[1],'base64').toString();
    const [user,pass] = b.split(':');
    if (user === u && pass === p) { req.session.isAdmin = true; return next(); }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

router.post('/login', (req,res)=>{
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/upload-keys', requireAdmin, upload.single('keys'), (req,res)=>{
  const text = require('fs').readFileSync(req.file.path,'utf8');
  const records = csv(text, { columns: true, skip_empty_lines: true });
  const insert = db.prepare('INSERT INTO product_keys (sku,key_value,notes,used) VALUES (?,?,?,0)');
  const insertMany = db.transaction((rows)=>{
    for (const r of rows) insert.run(r.sku, r.key_value || r.key, r.notes || '');
  });
  insertMany(records);
  return res.json({ imported: records.length });
});

router.get('/keys', requireAdmin, (req,res)=>{
  const keys = db.prepare('SELECT id,sku,key_value,notes,used,assigned_order_id,created_at FROM product_keys ORDER BY created_at DESC LIMIT 500').all();
  res.json(keys);
});

router.post('/add-product', requireAdmin, (req,res)=>{
  const { sku, name, price, currency, description, image } = req.body;
  if (!sku || !name || !price) return res.status(400).json({ error: 'Missing fields' });
  const price_cents = Math.round(parseFloat(price) * 100);
  try {
    db.prepare('INSERT INTO products (sku,name,price_cents,currency,description,image) VALUES (?,?,?,?,?,?)')
      .run(sku,name,price_cents,currency || 'GBP',description||'',image||'');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Insert failed', details: e.message });
  }
});

router.get('/orders', requireAdmin, (req,res)=>{
  const orders = db.prepare('SELECT id,order_number,email,total_cents,currency,status,created_at FROM orders ORDER BY created_at DESC LIMIT 200').all();
  res.json(orders);
});

module.exports = router;
