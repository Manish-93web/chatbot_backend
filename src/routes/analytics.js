const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

router.get('/overview', analyticsController.getOverview);
router.get('/realtime', analyticsController.getRealtime);
router.get('/agents', analyticsController.getAgentAnalytics);

module.exports = router;
