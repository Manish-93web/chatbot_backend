const express = require('express');
const router = express.Router();
const triggerController = require('../controllers/triggerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', triggerController.getTriggers);
router.post('/', triggerController.createTrigger);
router.put('/:id', triggerController.updateTrigger);
router.delete('/:id', triggerController.deleteTrigger);

module.exports = router;
