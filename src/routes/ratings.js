const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');

// Submit rating (public - no auth required for visitors)
router.post('/', ratingController.submitRating);

// Get ratings (protected)
router.get('/', protect, ratingController.getRatings);
router.get('/stats', protect, ratingController.getRatingStats);
router.get('/agent/:agentId', protect, ratingController.getAgentRatings);

// Delete rating (admin only)
router.delete('/:id', protect, ratingController.deleteRating);

module.exports = router;
