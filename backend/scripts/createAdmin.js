require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');
const { hashPassword } = require('../utils/hash');

async function createAdmin() {
  const username = 'admin';
  const password = 'admin123';
  const phone = '0000000000';

  try {
    const exists = await pool.query(`SELECT id FROM users WHERE username=$1`, [username]);
    if (exists.rows.length) {
      console.log(`Admin already exists with ID: ${exists.rows[0].id}`);
      return;
    }

    const hash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (role, username, phone, password_hash)
       VALUES ('admin', $1, $2, $3) RETURNING id`,
      [username, phone, hash]
    );
    console.log(`✅ Admin created! ID: ${rows[0].id}`);
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
}

module.exports = createAdmin;

// Only run directly (not when required as module)
if (require.main === module) {
  createAdmin().then(() => process.exit(0));
}
