const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { submitRating } = require('../controllers/ratingController');

router.post('/', auth, roleGuard('customer'), submitRating);

module.exports = router;
