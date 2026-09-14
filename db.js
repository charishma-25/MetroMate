const { Pool } = require('pg');
const { databaseUrl } = require('./config');

const pool = new Pool({
  connectionString: databaseUrl,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, close };