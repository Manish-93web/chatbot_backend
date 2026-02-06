const express = require('express');
const router = express.Router();
const omniController = require('../controllers/omniController');
const { protect } = require('../middleware/auth');

router.post('/webhook/email', omniController.simulateIncomingEmail);
router.post('/webhook/sms', omniController.simulateIncomingSMS);
router.post('/webhook/whatsapp', omniController.simulateIncomingWhatsApp);

module.exports = router;
