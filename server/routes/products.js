const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_URL || './prodkeys.db');

// GET /api/products
router.get('/products', (req, res) => {
  const rows = db.prepare('SELECT sku,name,price_cents,currency,description,image FROM products').all();
  const products = rows.map(r => ({
    sku: r.sku,
    name: r.name,
    price: (r.price_cents/100).toFixed(2),
    currency: r.currency,
    description: r.description,
    image: r.image
  }));
  res.json(products);
});

// GET /api/products/:sku
router.get('/products/:sku', (req, res) => {
  const sku = req.params.sku;
  const p = db.prepare('SELECT sku,name,price_cents,currency,description,image FROM products WHERE sku = ?').get(sku);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const product = {
    sku: p.sku,
    name: p.name,
    price: (p.price_cents/100).toFixed(2),
    currency: p.currency,
    description: p.description,
    image: p.image
  };
  res.json(product);
});

module.exports = router;
