const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/:chatId', messageController.getMessages);
router.post('/:chatId', messageController.sendMessage);
router.put('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;
