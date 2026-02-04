const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/', chatController.createChat);
router.get('/', chatController.getChats); // Public but controller handles auth logic
router.get('/:id', chatController.getChatById); // Made public
router.put('/:id', authMiddleware, chatController.updateChat);
router.delete('/:id', authMiddleware, chatController.deleteChat);

module.exports = router;
