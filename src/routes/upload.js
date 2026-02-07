const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
// Note: We might want to add auth middleware here, but for now kept open for visitor uploads
// const { protect } = require('../middleware/auth');

router.post('/', uploadController.uploadMiddleware, uploadController.uploadFile);
router.get('/:filename', uploadController.downloadFile);

module.exports = router;
