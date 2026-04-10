const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const messageController = require('../controllers/messageController');

const router = express.Router();
router.use(protect);

router.get('/conversations', messageController.listConversations);
router.get('/conversations/:caseId', messageController.getOrCreateConversation);
router.get('/messages/:conversationId', messageController.listMessages);
router.post('/messages', messageController.sendMessage);

module.exports = router;
