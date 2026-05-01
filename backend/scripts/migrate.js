require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const files = [
  'db/01_schema.sql',
  'db/02_indexes.sql',
  'db/05_add_delivery_address.sql',
];

async function migrate() {
  // Wait for DB to be ready (retry up to 5 times)
  for (let i = 0; i < 5; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      console.log(`DB not ready, retrying in 3s... (${i + 1}/5)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  for (const file of files) {
    try {
      const sql = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Migrated: ${file}`);
    } catch (err) {
      console.error(`⚠️  ${file}: ${err.message}`);
    }
  }

  // Run triggers/procedures
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../db/03_triggers_procedures.sql'), 'utf8'
    );
    await pool.query(sql);
    console.log('✅ Migrated: db/03_triggers_procedures.sql');
  } catch (err) {
    console.error('⚠️  triggers/procedures:', err.message);
  }
}

module.exports = migrate;
