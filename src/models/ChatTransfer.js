const mongoose = require('mongoose');

const chatTransferSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  },
  fromAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  toAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  toDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'auto_assigned'],
    default: 'pending',
  },
  notes: String,
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal',
  },
  acceptedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
  autoAssigned: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for faster queries
chatTransferSchema.index({ chatId: 1, createdAt: -1 });
chatTransferSchema.index({ toAgent: 1, status: 1 });
chatTransferSchema.index({ fromAgent: 1, createdAt: -1 });

module.exports = mongoose.model('ChatTransfer', chatTransferSchema);
