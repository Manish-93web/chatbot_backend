const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

const feedbackController = require('../controllers/feedbackController');

// Public routes
router.post('/', chatController.createChat);
router.get('/', chatController.getChats); // Public but controller handles auth logic
router.get('/overflow', authMiddleware, chatController.getOverflowChats);
router.get('/:id', chatController.getChatById); // Made public
router.put('/:id', authMiddleware, chatController.updateChat);
router.delete('/:id', authMiddleware, chatController.deleteChat);
router.post('/:id/callback', chatController.requestCallback);

// Feedback routes
router.post('/:id/feedback', feedbackController.submitFeedback);
router.post('/:id/transcript', feedbackController.sendTranscript);

module.exports = router;
