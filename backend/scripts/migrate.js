require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const files = [
  'db/01_schema.sql',
  'db/02_indexes.sql',
  'db/03_triggers_procedures.sql',
  'db/05_add_delivery_address.sql',
];

async function migrate() {
  for (const file of files) {
    try {
      const sql = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Migrated: ${file}`);
    } catch (err) {
      console.error(`⚠️  ${file}: ${err.message}`);
    }
  }
}

module.exports = migrate;
