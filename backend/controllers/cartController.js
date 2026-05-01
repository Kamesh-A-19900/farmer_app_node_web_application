const pool = require('../config/db');

const getCart = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.name, p.price_per_kg, p.image_base64, p.farmer_id
       FROM cart c JOIN products p ON p.id = c.product_id
       WHERE c.customer_id=$1`, [req.user.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'product_id and quantity are required' });
    }
    // Check product exists
    const prod = await pool.query(
      `SELECT id, quantity_kg FROM products WHERE id=$1`, [product_id]
    );
    if (!prod.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (quantity > prod.rows[0].quantity_kg) {
      return res.status(400).json({ error: `Only ${prod.rows[0].quantity_kg} kg available` });
    }

    const { rows } = await pool.query(
      `INSERT INTO cart (customer_id, product_id, quantity)
       VALUES ($1,$2,$3)
       ON CONFLICT (customer_id, product_id) DO UPDATE SET quantity = $3
       RETURNING *`,
      [req.user.userId, product_id, quantity]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

const updateCart = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity < 1) {
      await pool.query(`DELETE FROM cart WHERE id=$1 AND customer_id=$2`, [req.params.id, req.user.userId]);
      return res.json({ message: 'Item removed' });
    }
    const { rows } = await pool.query(
      `UPDATE cart SET quantity=$1 WHERE id=$2 AND customer_id=$3 RETURNING *`,
      [quantity, req.params.id, req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cart item not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const removeFromCart = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM cart WHERE id=$1 AND customer_id=$2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Item removed' });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCart, removeFromCart };
