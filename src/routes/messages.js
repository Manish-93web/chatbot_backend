const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Both public and private access
router.get('/:chatId', messageController.getMessages);
router.post('/:chatId', messageController.sendMessage);

// Public routes
router.post('/:chatId', messageController.sendMessage);
router.get('/:chatId', messageController.getMessages); // Made public for Widget history

module.exports = router;
