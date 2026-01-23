const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/Chat.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/conversations', authenticate, ChatController.listConversations);
router.post('/start', authenticate, ChatController.startConversation);
router.get('/conversations/:id/messages', authenticate, ChatController.getMessages);
router.post('/messages', authenticate, ChatController.sendMessage);

module.exports = router;
