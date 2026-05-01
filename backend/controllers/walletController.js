const pool = require('../config/db');

const getWallet = async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query(
      `SELECT wallet_balance FROM users WHERE id=$1`, [req.user.userId]
    );
    const { rows: txns } = await pool.query(
      `SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY timestamp DESC LIMIT 50`,
      [req.user.userId]
    );
    res.json({ balance: user.wallet_balance, transactions: txns });
  } catch (err) { next(err); }
};

const topUp = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    await pool.query(`UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id=$2`, [amount, req.user.userId]);
    await pool.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, status) VALUES ($1,$2,'credit','completed')`,
      [req.user.userId, amount]
    );
    res.json({ message: `₹${amount} added to wallet` });
  } catch (err) { next(err); }
};

module.exports = { getWallet, topUp };
