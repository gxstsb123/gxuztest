const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const db = new Database(process.env.DB_URL || './prodkeys.db');
const { sendKeyEmail } = require('../utils/email');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const paypal = require('paypal-rest-sdk');

// Configure PayPal SDK if creds provided
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  paypal.configure({
    mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
  });
}

// Helper: reserve keys for an order (mark as used when payment confirmed)
function assignKeysForOrder(orderId, items) {
  const assigned = [];
  const insertItem = db.prepare('INSERT INTO order_items (order_id, sku, qty, unit_price_cents) VALUES (?,?,?,?)');
  const selectKey = db.prepare('SELECT * FROM product_keys WHERE sku = ? AND used = 0 LIMIT 1');
  const markUsed = db.prepare('UPDATE product_keys SET used = 1, assigned_order_id = ? WHERE id = ?');
  items.forEach(it => {
    for (let i=0;i<it.qty;i++) {
      const key = selectKey.get(it.sku);
      if (key) {
        insertItem.run(orderId, it.sku, 1, it.unit_price_cents);
        markUsed.run(key.id, key.id); // assigned_order_id = id (small hack)
        assigned.push({ sku: it.sku, key_id: key.id, key_value: key.key_value });
      } else {
        // no key available - still insert item with no assigned_key_id
        insertItem.run(orderId, it.sku, 1, it.unit_price_cents);
        assigned.push({ sku: it.sku, key_id: null, key_value: null });
      }
    }
  });
  return assigned;
}

// POST /api/cart/checkout
router.post('/cart/checkout', async (req, res) => {
  try {
    const { email, items, provider } = req.body; // items: [{sku, qty, unit_price_cents}]
    if (!email || !items || !Array.isArray(items)) return res.status(400).json({ error: 'Missing fields' });
    const totalCents = items.reduce((s,it)=>s+(it.unit_price_cents*it.qty),0);
    const orderNumber = 'GX' + Date.now();
    const insert = db.prepare('INSERT INTO orders (order_number,email,total_cents,currency,payment_provider,status) VALUES (?,?,?,?,?,?)');
    const result = insert.run(orderNumber,email,totalCents,items[0]?.currency || 'GBP', provider || 'unknown', 'pending');
    const orderId = result.lastInsertRowid;

    // For Stripe: create Checkout Session
    if (provider === 'stripe') {
      const line_items = items.map(it => ({
        price_data: {
          currency: it.currency || 'gbp',
          product_data: { name: it.sku },
          unit_amount: it.unit_price_cents
        },
        quantity: it.qty
      }));
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.json({ message: 'Stripe keys not configured on server', redirect: '/success.html?order='+orderNumber });
      }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        success_url: (req.body.success_url || `${req.protocol}://${req.get('host')}/success.html`)+`?order=${orderNumber}`,
        cancel_url: (req.body.cancel_url || `${req.protocol}://${req.get('host')}/cancel.html`)+`?order=${orderNumber}`,
        metadata: { order_id: orderId }
      });
      return res.json({ url: session.url, order_number: orderNumber });
    }

    // For PayPal: create order (simplified)
    if (provider === 'paypal') {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        return res.json({ message: 'PayPal not configured', redirect: '/success.html?order='+orderNumber });
      }
      const purchase_units = [{ amount: { currency_code: items[0]?.currency || 'GBP', value: (totalCents/100).toFixed(2) } }];
      const create_payment_json = { intent: 'CAPTURE', purchase_units };
      paypal.order.create(create_payment_json, function (error, order) {
        if (error) {
          console.error(error);
          return res.status(500).json({ error: 'PayPal error' });
        } else {
          // return approve link
          const approve = order.links.find(l=>l.rel==='approve');
          return res.json({ url: approve.href, order_number: orderNumber });
        }
      });
      return;
    }

    // Fallback: no payment - mark completed and assign keys and email
    const assigned = assignKeysForOrder(orderId, items);
    // Update order status to completed
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('completed', orderId);

    // Send email with keys
    const keyText = assigned.map(a=>`${a.sku}: ${a.key_value || '[NO KEY AVAILABLE]'}`).join('\n');
    try {
      await sendKeyEmail(email, `Your GXUZ order ${orderNumber}`, `Thanks for your order.\nOrder: ${orderNumber}\n\nKeys:\n${keyText}`);
    } catch (e) {
      console.error('Email error', e);
    }

    // Generate simple invoice page
    const invoiceHtml = `<html><body><h1>Order ${orderNumber}</h1><p>Email: ${email}</p><pre>${keyText}</pre></body></html>`;
    const fs = require('fs');
    const path = require('path');
    const invoicesDir = path.join(__dirname,'..','public','invoices');
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir,{recursive:true});
    fs.writeFileSync(path.join(invoicesDir,orderNumber+'.html'), invoiceHtml);

    return res.json({ message: 'completed', order_number: orderNumber, invoice: `/invoices/${orderNumber}.html` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
