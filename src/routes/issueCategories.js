const express = require('express');
const router = express.Router();
const IssueCategory = require('../models/IssueCategory');

// @desc    Get all active categories
// @route   GET /api/issue-categories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const categories = await IssueCategory.find({ enabled: true }).select('name description');
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;
