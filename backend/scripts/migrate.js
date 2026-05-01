require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Only run schema + indexes via SQL files (safe with IF NOT EXISTS)
// Triggers/procedures are complex — skip in auto-migration, handle manually
const files = [
  'db/01_schema.sql',
  'db/02_indexes.sql',
  'db/05_add_delivery_address.sql',
];

async function migrate() {
  for (const file of files) {
    try {
      const sql = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Migrated: ${file}`);
    } catch (err) {
      // Log but don't crash — some statements may already exist
      console.error(`⚠️  ${file}: ${err.message}`);
    }
  }

  // Run triggers/procedures individually
  try {
    await runTriggers();
  } catch (err) {
    console.error('⚠️  triggers:', err.message);
  }
}

async function runTriggers() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../db/03_triggers_procedures.sql'), 'utf8'
    );
    // Execute the whole file as one transaction
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migrated: db/03_triggers_procedures.sql');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('⚠️  triggers/procedures:', err.message);
  } finally {
    client.release();
  }
}

module.exports = migrate;
