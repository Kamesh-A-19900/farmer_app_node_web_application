const pool = require('../config/db');

const getUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, role, username, phone, wallet_balance, created_at FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const getProducts = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.username as farmer_name FROM products p JOIN users u ON u.id=p.farmer_id ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT l.*, u.username FROM logs l LEFT JOIN users u ON u.id=l.user_id
       ORDER BY l.timestamp DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const getTransactions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wt.*, u.username FROM wallet_transactions wt
       JOIN users u ON u.id=wt.user_id ORDER BY wt.timestamp DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [users, products, orders, revenue] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*) FROM products`),
      pool.query(`SELECT COUNT(*) FROM orders`),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders`),
    ]);
    res.json({
      totalUsers: users.rows[0].count,
      totalProducts: products.rows[0].count,
      totalOrders: orders.rows[0].count,
      totalRevenue: revenue.rows[0].total,
    });
  } catch (err) { next(err); }
};

module.exports = { getUsers, getProducts, getLogs, getTransactions, getAnalytics };
