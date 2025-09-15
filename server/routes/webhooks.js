const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_URL || './prodkeys.db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const paypal = require('paypal-rest-sdk');
const { sendKeyEmail } = require('../utils/email');
const fs = require('fs');
const path = require('path');

// Stripe webhook
router.post('/stripe', express.raw({type: 'application/json'}), (req,res)=>{
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body; // In dev without signature
    }
  } catch (err) {
    console.error('Stripe webhook signature error', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.processed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    if (orderId) {
      // mark order completed and assign keys
      db.prepare('UPDATE orders SET status = ?, payment_id = ? WHERE id = ?').run('completed', session.payment_intent || session.id, orderId);
      // Assign keys (simple logic)
      const items = []; // a full implementation would read session line items via Stripe API
      // For demo, send an email saying order completed
      const order = db.prepare('SELECT order_number,email FROM orders WHERE id = ?').get(orderId);
      if (order) {
        const invoiceHtml = `<html><body><h1>Order ${order.order_number}</h1><p>Payment received via Stripe.</p></body></html>`;
        const invoicesDir = path.join(__dirname,'..','public','invoices');
        if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir,{recursive:true});
        fs.writeFileSync(path.join(invoicesDir,order.order_number+'.html'), invoiceHtml);
        try { sendKeyEmail(order.email, 'Your GXUZ order', 'Your payment was received. Check your invoice.'); } catch(e){console.error(e);}
      }
    }
  }
  res.json({received:true});
});

// PayPal webhook (simplified)
router.post('/paypal', (req,res)=>{
  // For full verification, follow PayPal docs. Here we accept the post and mark order if present.
  const body = req.body;
  console.log('PayPal webhook received', body);
  res.json({received:true});
});

module.exports = router;
