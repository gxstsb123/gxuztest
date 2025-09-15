require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const productsRouter = require('./routes/products');
const checkoutRouter = require('./routes/checkout');
const webhooksRouter = require('./routes/webhooks');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT || '500'),
  message: { error: 'Too many requests, slow down.' }
});
app.use(limiter);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', productsRouter);
app.use('/api', checkoutRouter);
app.use('/webhook', webhooksRouter);
app.use('/admin', adminRouter);

app.get('/healthz', (req, res) => res.json({ ok: true }));

// Ensure invoices directory exists
const invoicesDir = path.join(__dirname, '..', 'public', 'invoices');
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

// Start server
app.listen(PORT, () => {
  console.log(`GXUZ Services listening on http://localhost:${PORT}`);
});
