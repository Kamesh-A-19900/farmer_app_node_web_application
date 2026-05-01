const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

router.get('/logs', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT cl.*, u1.username as caller_name, u2.username as receiver_name
       FROM call_logs cl
       JOIN users u1 ON u1.id=cl.caller_id
       JOIN users u2 ON u2.id=cl.receiver_id
       WHERE cl.caller_id=$1 OR cl.receiver_id=$1
       ORDER BY cl.start_time DESC LIMIT 50`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
