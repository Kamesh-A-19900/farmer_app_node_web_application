const router = require('express').Router();
const auth = require('../middleware/auth');
const { getConversations, getMessages, startConversation } = require('../controllers/chatController');

router.get('/conversations', auth, getConversations);
router.get('/messages/:convId', auth, getMessages);
router.post('/conversations', auth, startConversation);

module.exports = router;
