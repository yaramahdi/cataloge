const { getPool } = require('./database');
const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, 'seed.sql');

async function importData() {
  const pool = await getPool();

  if (!fs.existsSync(SEED_PATH)) {
    console.log('[IMPORT] No seed.sql found. Run "npm run export:data" first.');
    await pool.end();
    return;
  }

  const sql = fs.readFileSync(SEED_PATH, 'utf8');
  if (!sql.trim()) {
    console.log('[IMPORT] seed.sql is empty.');
    await pool.end();
    return;
  }

  try {
    await pool.query(sql);
    console.log('[IMPORT] Data imported successfully to PostgreSQL.');
  } catch (err) {
    console.error('[IMPORT] Error:', err.message);
  }

  await pool.end();
}

importData();
