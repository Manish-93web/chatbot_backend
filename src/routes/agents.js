const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

router.get('/', agentController.getAgents);
router.get('/metadata', agentController.getMetadata);
router.post('/', agentController.createAgent);
router.get('/:id', agentController.getAgentById);
router.put('/:id', agentController.updateAgent);
router.put('/:id/status', agentController.updateStatus);
router.post('/:id/break', agentController.handleBreak);
router.delete('/:id', agentController.deleteAgent);


module.exports = router;
