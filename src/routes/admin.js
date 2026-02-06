const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes here are admin-only
router.use(protect, authorize('admin')); 

// Device Catalog
router.get('/devices', protect, adminController.getDevices);
router.post('/devices', protect, adminController.createDevice);
router.put('/devices/:id', protect, adminController.updateDevice);
router.delete('/devices/:id', protect, adminController.deleteDevice);

// Issue Categories
router.get('/categories', protect, adminController.getCategories);
router.post('/categories', protect, adminController.createCategory);
router.put('/categories/:id', protect, adminController.updateCategory);

// SLA Config
router.get('/sla', protect, adminController.getSLAs);
router.put('/sla/:id', protect, adminController.updateSLA);

module.exports = router;
