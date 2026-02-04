const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widgetController');
const authMiddleware = require('../middleware/auth');

// Public route
router.get('/config', widgetController.getConfig);

// Protected route
router.put('/config', authMiddleware, widgetController.updateConfig);

module.exports = router;
