const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../db/database');
const { uploadImage, deleteImage } = require('../db/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- ORDERS ---

router.get('/orders', async (req, res) => {
  const pool = await getPool();
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/orders', async (req, res) => {
  const pool = await getPool();
  const { account_name, total_price, formatted_price, formatted_cost } = req.body;
  if (!account_name || account_name.trim() === '') {
    return res.status(400).json({ error: 'account_name مطلوب' });
  }
  if (total_price == null || isNaN(total_price) || total_price <= 0) {
    return res.status(400).json({ error: 'total_price يجب أن يكون رقماً موجباً' });
  }
  const costValue = formatted_cost != null ? parseFloat(formatted_cost) : 0;
  if (isNaN(costValue) || costValue < 0) {
    return res.status(400).json({ error: 'formatted_cost يجب أن يكون رقماً غير سالباً' });
  }
  const id = uuidv4();
  const { rows } = await pool.query(
    'INSERT INTO orders (id, account_name, total_price, formatted_price, formatted_cost) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, account_name.trim(), total_price, formatted_price || '', costValue]
  );
  res.status(201).json(rows[0]);
});

router.get('/orders/:id', async (req, res) => {
  const pool = await getPool();
  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
  const { rows: products } = await pool.query('SELECT * FROM products WHERE order_id = $1 ORDER BY id', [req.params.id]);
  res.json({ order: orderRows[0], products });
});

router.delete('/orders/:id', async (req, res) => {
  const pool = await getPool();
  const { rows: products } = await pool.query('SELECT image_path FROM products WHERE order_id = $1', [req.params.id]);
  for (const p of products) {
    if (p.image_path) await deleteImage(p.image_path);
  }
  const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Order not found' });
  res.status(204).send();
});

router.put('/orders/:id', async (req, res) => {
  const pool = await getPool();
  const { rows: existing } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Order not found' });

  const order = existing[0];
  const { total_price, formatted_price, formatted_cost } = req.body;
  const price = total_price != null ? parseFloat(total_price) : order.total_price;
  const fmtPrice = formatted_price != null ? formatted_price : order.formatted_price;
  const costValue = formatted_cost != null ? parseFloat(formatted_cost) : (order.formatted_cost || 0);

  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'total_price يجب أن يكون رقماً موجباً' });
  if (isNaN(costValue) || costValue < 0) return res.status(400).json({ error: 'formatted_cost يجب أن يكون رقماً غير سالباً' });

  const { rows } = await pool.query(
    'UPDATE orders SET total_price = $1, formatted_price = $2, formatted_cost = $3 WHERE id = $4 RETURNING *',
    [price, fmtPrice, costValue, req.params.id]
  );
  res.json(rows[0]);
});

// --- PRODUCTS ---

router.post('/orders/:id/products', upload.single('image'), async (req, res) => {
  const pool = await getPool();
  const orderId = req.params.id;
  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });

  const { quantity, size, raw_price, selling_price } = req.body;
  const qty = parseInt(quantity) || 1;
  const rawPrice = parseFloat(raw_price);
  const sellPrice = parseFloat(selling_price);

  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'quantity يجب أن تكون رقماً موجباً' });
  if (isNaN(rawPrice) || rawPrice <= 0) return res.status(400).json({ error: 'raw_price يجب أن يكون رقماً موجباً' });
  if (isNaN(sellPrice) || sellPrice <= 0) return res.status(400).json({ error: 'selling_price يجب أن يكون رقماً موجباً' });

  const id = uuidv4();
  let imageUrl = null;
  if (req.file) {
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const tmpPath = path.join(uploadsDir, `${uuidv4()}`);
    fs.writeFileSync(tmpPath, req.file.buffer);
    imageUrl = await uploadImage(tmpPath);
    fs.unlinkSync(tmpPath);
  }

  const { rows } = await pool.query(
    `INSERT INTO products (id, order_id, image_path, quantity, size, raw_price, selling_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, orderId, imageUrl, qty, size || '', rawPrice, sellPrice]
  );
  res.status(201).json(rows[0]);
});

router.post('/products/:id/sell', async (req, res) => {
  const pool = await getPool();
  const productId = req.params.id;
  const { selling_price } = req.body;

  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  const product = rows[0];
  if (product.sold_out) return res.status(400).json({ error: 'Product is sold out' });

  let price = selling_price != null ? parseFloat(selling_price) : product.selling_price;
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'selling_price يجب أن يكون رقماً موجباً' });

  const profit = price - product.raw_price;
  const saleId = uuidv4();
  const newQty = product.quantity - 1;
  const newSoldCount = product.sold_count + 1;
  const soldOut = newQty <= 0 ? 1 : 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO sales (id, product_id, order_id, image_path, raw_price, selling_price, profit)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [saleId, productId, product.order_id, product.image_path, product.raw_price, price, profit]
    );
    await client.query(
      'UPDATE products SET quantity = $1, sold_count = $2, sold_out = $3 WHERE id = $4',
      [newQty, newSoldCount, soldOut, productId]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  res.json({ saleId, newQty, soldOut: !!soldOut, profit });
});

router.delete('/products/:id', async (req, res) => {
  const pool = await getPool();
  const { rows } = await pool.query('SELECT image_path FROM products WHERE id = $1', [req.params.id]);
  if (rows.length > 0 && rows[0].image_path) {
    await deleteImage(rows[0].image_path);
  }
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Product not found' });
  res.status(204).send();
});

router.put('/products/:id', upload.single('image'), async (req, res) => {
  const pool = await getPool();
  const productId = req.params.id;
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  const product = rows[0];

  const { quantity, size, raw_price, selling_price } = req.body;
  const qty = quantity != null ? parseInt(quantity) : product.quantity;
  const rawPrice = raw_price != null ? parseFloat(raw_price) : product.raw_price;
  const sellPrice = selling_price != null ? parseFloat(selling_price) : product.selling_price;
  const productSize = size != null ? size : product.size;

  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'quantity يجب أن تكون رقماً موجباً' });
  if (isNaN(rawPrice) || rawPrice <= 0) return res.status(400).json({ error: 'raw_price يجب أن يكون رقماً موجباً' });
  if (isNaN(sellPrice) || sellPrice <= 0) return res.status(400).json({ error: 'selling_price يجب أن يكون رقماً موجباً' });

  let imageUrl = product.image_path;
  if (req.file) {
    if (product.image_path) await deleteImage(product.image_path);
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const tmpPath = path.join(uploadsDir, `${uuidv4()}`);
    fs.writeFileSync(tmpPath, req.file.buffer);
    imageUrl = await uploadImage(tmpPath);
    fs.unlinkSync(tmpPath);
  }

  const { rows: updated } = await pool.query(
    'UPDATE products SET quantity = $1, size = $2, raw_price = $3, selling_price = $4, image_path = $5 WHERE id = $6 RETURNING *',
    [qty, productSize, rawPrice, sellPrice, imageUrl, productId]
  );
  res.json(updated[0]);
});

// --- SALES & STATS ---

router.get('/orders/:id/sales', async (req, res) => {
  const pool = await getPool();
  const { rows } = await pool.query('SELECT * FROM sales WHERE order_id = $1 ORDER BY sold_at DESC', [req.params.id]);
  res.json(rows);
});

router.get('/orders/:id/stats', async (req, res) => {
  const pool = await getPool();
  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
  const order = orderRows[0];
  const { rows: sales } = await pool.query('SELECT * FROM sales WHERE order_id = $1 ORDER BY sold_at DESC', [req.params.id]);
  const { rows: products } = await pool.query('SELECT quantity, raw_price, selling_price FROM products WHERE order_id = $1', [req.params.id]);

  let plannedTotalSelling = 0;
  let plannedTotalCost = 0;
  products.forEach(product => {
    plannedTotalSelling += product.selling_price * product.quantity;
    plannedTotalCost += product.raw_price * product.quantity;
  });

  const plannedTotalProfit = plannedTotalSelling - plannedTotalCost;
  const formattingCost = order.formatted_cost || 0;
  const netProfitAfterFormatting = plannedTotalProfit - formattingCost;
  const coversFormatting = netProfitAfterFormatting >= 0;

  res.json({
    order,
    sales,
    summary: {
      planned_total_selling: plannedTotalSelling,
      planned_total_cost: plannedTotalCost,
      planned_total_profit: plannedTotalProfit,
      formatted_cost: formattingCost,
      net_profit_after_formatting: netProfitAfterFormatting,
      covers_formatting: coversFormatting
    }
  });
});

router.get('/orders/:id/charts', async (req, res) => {
  const pool = await getPool();
  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
  const { rows: sales } = await pool.query('SELECT * FROM sales WHERE order_id = $1 ORDER BY sold_at ASC', [req.params.id]);
  res.json({ order: orderRows[0], sales });
});

module.exports = router;
