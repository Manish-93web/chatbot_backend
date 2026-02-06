const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

// Ticket CRUD
router.post('/', protect, ticketController.createTicket);
router.get('/', protect, ticketController.getTickets);
router.get('/stats', protect, ticketController.getTicketStats);
router.get('/:id', protect, ticketController.getTicket);
router.put('/:id', protect, ticketController.updateTicket);

// Ticket operations
router.post('/:id/escalate', protect, ticketController.escalateTicket);
router.post('/merge', protect, ticketController.mergeTickets);
router.post('/:id/reopen', ticketController.reopenTicket); // Allow visitors to reopen
router.post('/:id/close', protect, ticketController.closeTicket);

// Convert chat to ticket
router.post('/convert/:chatId', protect, ticketController.convertChatToTicket);

module.exports = router;
