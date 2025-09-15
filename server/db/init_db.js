const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const sql = fs.readFileSync(path.join(__dirname,'init.sql'),'utf8');
const dbFile = process.env.DB_URL || path.join(__dirname,'..','prodkeys.db');
const db = new Database(dbFile);
db.exec(sql);

// Insert sample products if products table empty
const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if(count === 0){
  const insert = db.prepare('INSERT INTO products (sku,name,price_cents,currency,description,image) VALUES (?,?,?,?,?,?)');
  insert.run('TEST-001','Test Starter Pack', 499, 'GBP', 'Starter pack with sample keys', '/images/gxuz1.svg');
  insert.run('PRO-KEY1','Pro Access Key', 1299, 'GBP', 'Professional access key with extended features', '/images/gxuz2.svg');
  insert.run('BUNDLE-10','Bundle 10 Keys', 3999, 'GBP', 'Pack of 10 keys at a discount', '/images/gxuz1.svg');
  console.log('Sample products inserted');
} else {
  console.log('Products already exist, skipping seed');
}

console.log('Database initialized at', dbFile);
db.close();
