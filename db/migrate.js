const Database = require('better-sqlite3');
const { cloudinary } = require('./cloudinary');
const path = require('path');
const fs = require('fs');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'orders.db');

async function migrateImages() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('[MIGRATE] No local SQLite database found. Skipping.');
    return;
  }

  const db = new Database(SQLITE_PATH);
  const products = db.prepare('SELECT id, image_path FROM products WHERE image_path IS NOT NULL AND image_path NOT LIKE \'http%\'').all();

  if (products.length === 0) {
    console.log('[MIGRATE] No local images to migrate.');
    db.close();
    return;
  }

  console.log(`[MIGRATE] Found ${products.length} local images to upload to Cloudinary...`);

  for (const product of products) {
    const localPath = path.join(__dirname, '..', 'uploads', product.image_path);
    if (!fs.existsSync(localPath)) {
      console.log(`[MIGRATE] File not found: ${localPath}`);
      continue;
    }

    try {
      const result = await cloudinary.uploader.upload(localPath, {
        folder: 'cataloge-products',
        resource_type: 'auto'
      });
      db.prepare('UPDATE products SET image_path = ? WHERE id = ?').run(result.secure_url, product.id);
      console.log(`[MIGRATE] Uploaded: ${product.image_path} -> ${result.secure_url}`);
    } catch (err) {
      console.error(`[MIGRATE] Failed to upload ${product.image_path}:`, err.message);
    }
  }

  db.close();
  console.log('[MIGRATE] Done.');
}

migrateImages().catch(err => {
  console.error('[MIGRATE] Error:', err);
  process.exit(1);
});
