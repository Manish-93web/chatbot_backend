const express = require('express');
const router = express.Router();
const shortcutController = require('../controllers/shortcutController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', shortcutController.getShortcuts);
router.post('/', shortcutController.createShortcut);
router.put('/:id', shortcutController.updateShortcut);
router.delete('/:id', shortcutController.deleteShortcut);

module.exports = router;
