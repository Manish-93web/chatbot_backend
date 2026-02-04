const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getCurrentAgent);
router.put('/profile', protect, authController.updateProfile);

module.exports = router;
