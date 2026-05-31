const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema_pg.sql');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

let initialized = false;

async function initDb() {
  if (initialized) return;
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await pool.query(schema);
  initialized = true;
  console.log('[DB] PostgreSQL initialized');
}

async function getPool() {
  if (!initialized) await initDb();
  return pool;
}

module.exports = { getPool, pool };
