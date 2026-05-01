const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/stats', async (req, res, next) => {
  try {
    const pool = require('../config/db');
    const [users, products, orders, revenue] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE role IN ('farmer','customer')`),
      pool.query(`SELECT COUNT(*) FROM products`),
      pool.query(`SELECT COUNT(*) FROM orders`),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM orders`),
    ]);
    res.json({
      totalUsers: users.rows[0].count,
      totalProducts: products.rows[0].count,
      totalOrders: orders.rows[0].count,
      totalRevenue: revenue.rows[0].total,
    });
  } catch (err) { next(err); }
});
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', auth, roleGuard('farmer'), createProduct);
router.put('/:id', auth, roleGuard('farmer'), updateProduct);
router.delete('/:id', auth, roleGuard('farmer'), deleteProduct);

module.exports = router;
