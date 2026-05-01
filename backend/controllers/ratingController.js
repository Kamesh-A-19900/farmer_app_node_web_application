const pool = require('../config/db');

const submitRating = async (req, res, next) => {
  try {
    const { farmer_id, rating, review } = req.body;
    const customerId = req.user.userId;
    // Verify customer has ordered from this farmer
    const { rows } = await pool.query(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.customer_id=$1 AND p.farmer_id=$2 LIMIT 1`,
      [customerId, farmer_id]
    );
    if (!rows.length) return res.status(403).json({ error: 'You must complete an order before rating' });

    await pool.query(
      `INSERT INTO ratings (farmer_id, customer_id, rating, review)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (farmer_id, customer_id) DO UPDATE SET rating=$3, review=$4`,
      [farmer_id, customerId, rating, review || null]
    );
    res.status(201).json({ message: 'Rating submitted' });
  } catch (err) { next(err); }
};

module.exports = { submitRating };
