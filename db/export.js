const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'orders.db');
const OUTPUT_PATH = path.join(__dirname, 'seed.sql');

function exportToSql() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('[EXPORT] No local SQLite database found.');
    return;
  }

  const db = new Database(SQLITE_PATH);
  let sql = '';

  const orders = db.prepare('SELECT * FROM orders').all();
  for (const o of orders) {
    sql += `INSERT INTO orders (id, account_name, total_price, formatted_price, created_at) VALUES ('${o.id}', '${(o.account_name || '').replace(/'/g, "''")}', ${o.total_price}, '${(o.formatted_price || '').replace(/'/g, "''")}', '${o.created_at}');\n`;
  }

  const products = db.prepare('SELECT * FROM products').all();
  for (const p of products) {
    const img = (p.image_path || '').replace(/'/g, "''");
    sql += `INSERT INTO products (id, order_id, image_path, quantity, size, raw_price, selling_price, sold_count, sold_out) VALUES ('${p.id}', '${p.order_id}', '${img}', ${p.quantity}, '${(p.size || '').replace(/'/g, "''")}', ${p.raw_price}, ${p.selling_price}, ${p.sold_count || 0}, ${p.sold_out || 0});\n`;
  }

  const sales = db.prepare('SELECT * FROM sales').all();
  for (const s of sales) {
    const img = (s.image_path || '').replace(/'/g, "''");
    sql += `INSERT INTO sales (id, product_id, order_id, image_path, raw_price, selling_price, profit, sold_at) VALUES ('${s.id}', '${s.product_id}', '${s.order_id}', '${img}', ${s.raw_price}, ${s.selling_price}, ${s.profit}, '${s.sold_at}');\n`;
  }

  fs.writeFileSync(OUTPUT_PATH, sql);
  console.log(`[EXPORT] Exported ${orders.length} orders, ${products.length} products, ${sales.length} sales to ${OUTPUT_PATH}`);
  db.close();
}

exportToSql();
