CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  total_price REAL NOT NULL,
  formatted_price TEXT,
  formatted_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (NOW() AT TIME ZONE 'localtime')::TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  image_path TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  raw_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  sold_count INTEGER DEFAULT 0,
  sold_out INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  image_path TEXT,
  raw_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  profit REAL NOT NULL,
  sold_at TEXT DEFAULT (NOW() AT TIME ZONE 'localtime')::TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_order_id ON products(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
