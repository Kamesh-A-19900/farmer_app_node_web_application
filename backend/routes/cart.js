const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { getCart, addToCart, updateCart, removeFromCart } = require('../controllers/cartController');

router.get('/', auth, roleGuard('customer'), getCart);
router.post('/', auth, roleGuard('customer'), addToCart);
router.put('/:id', auth, roleGuard('customer'), updateCart);
router.delete('/:id', auth, roleGuard('customer'), removeFromCart);

module.exports = router;
