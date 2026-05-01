const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { createOrder, getOrders, getOrderNotifications, clearNotifications, getAuctionNotifications, clearAuctionNotifications } = require('../controllers/orderController');

router.get('/', auth, getOrders);
router.post('/', auth, roleGuard('customer'), createOrder);
router.get('/notifications', auth, roleGuard('farmer'), getOrderNotifications);
router.delete('/notifications', auth, roleGuard('farmer'), clearNotifications);
router.get('/auction-notifications', auth, roleGuard('farmer'), getAuctionNotifications);
router.delete('/auction-notifications', auth, roleGuard('farmer'), clearAuctionNotifications);

module.exports = router;
