const pool = require('../config/db');

const errorHandler = async (err, req, res, next) => {
  console.error(err.stack);
  // Log to DB
  try {
    await pool.query(
      `INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)`,
      [req.user?.userId || null, 'ERROR', JSON.stringify({ message: err.message, path: req.path })]
    );
  } catch (_) {}
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
};

module.exports = errorHandler;
