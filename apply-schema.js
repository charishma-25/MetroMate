const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  await pool.end();
  // eslint-disable-next-line no-console
  console.log('Schema applied.');
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});