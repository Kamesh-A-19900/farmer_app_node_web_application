const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { getUsers, getProducts, getLogs, getTransactions, getAnalytics } = require('../controllers/adminController');

router.use(auth, roleGuard('admin'));
router.get('/users', getUsers);
router.get('/products', getProducts);
router.get('/logs', getLogs);
router.get('/transactions', getTransactions);
router.get('/analytics', getAnalytics);

module.exports = router;
