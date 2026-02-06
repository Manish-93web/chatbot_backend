const express = require('express');
const router = express.Router();
const cannedResponseController = require('../controllers/cannedResponseController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', cannedResponseController.getCannedResponses);
router.post('/', cannedResponseController.createCannedResponse);
router.delete('/:id', cannedResponseController.deleteCannedResponse);

module.exports = router;
