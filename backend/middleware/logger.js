const pool = require('../config/db');

const logger = async (req, res, next) => {
  const start = Date.now();
  res.on('finish', async () => {
    try {
      await pool.query(
        `INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)`,
        [
          req.user?.userId || null,
          `${req.method} ${req.path}`,
          JSON.stringify({ status: res.statusCode, ms: Date.now() - start }),
        ]
      );
    } catch (_) {}
  });
  next();
};

module.exports = logger;
