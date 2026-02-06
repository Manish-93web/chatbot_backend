const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { protect, authorize } = require('../middleware/auth');

// Get all subscription tiers
router.get('/', async (req, res) => {
    try {
        const subscriptions = await Subscription.find().sort({ priorityLevel: 1 });
        res.json({ success: true, subscriptions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create/Update tier (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const subscription = await Subscription.findOneAndUpdate(
            { name: req.body.name },
            req.body,
            { upsert: true, new: true }
        );
        res.status(201).json({ success: true, subscription });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
