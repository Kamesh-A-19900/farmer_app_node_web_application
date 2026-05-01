const pool = require('../config/db');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveOTP = async (phone, purpose) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await pool.query(
    `INSERT INTO otp_verifications (phone, otp_code, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [phone, otp, purpose, expiresAt]
  );
  // In production: send via SMS provider. In dev: log to console.
  console.log(`[OTP] Phone: ${phone} | Code: ${otp} | Purpose: ${purpose}`);
  return otp;
};

const verifyOTP = async (phone, code, purpose) => {
  const { rows } = await pool.query(
    `SELECT * FROM otp_verifications
     WHERE phone=$1 AND otp_code=$2 AND purpose=$3
       AND used=FALSE AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [phone, code, purpose]
  );
  if (!rows.length) return false;
  await pool.query(`UPDATE otp_verifications SET used=TRUE WHERE id=$1`, [rows[0].id]);
  return true;
};

module.exports = { saveOTP, verifyOTP };
