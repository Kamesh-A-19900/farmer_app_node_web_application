const router = require('express').Router();
const auth = require('../middleware/auth');
const { getWallet, topUp } = require('../controllers/walletController');

router.get('/', auth, getWallet);
router.post('/topup', auth, topUp);

module.exports = router;
