const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/', visitorController.trackVisitor);
router.put('/:id', visitorController.updateVisitor);
router.get('/', visitorController.getVisitors); // Made public for Dashboard visibility
router.get('/:id', visitorController.getVisitorById); // Made public for Widget re-join
router.post('/:id/warranty', visitorController.validateWarranty);
router.post('/:id/upgrade', visitorController.upgradeSubscription);

module.exports = router;
