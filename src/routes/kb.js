const express = require('express');
const router = express.Router();
const kbController = require('../controllers/kbController');
const { protect } = require('../middleware/auth');

// Public routes (search and view)
router.get('/', kbController.getArticles);
router.get('/:id', kbController.getArticle);
router.post('/:id/rate', kbController.rateArticle);

// Protected routes (CRUD)
router.post('/', protect, kbController.createArticle);
router.put('/:id', protect, kbController.updateArticle);
router.delete('/:id', protect, kbController.deleteArticle);

module.exports = router;
