const mongoose = require('mongoose');

const internalNoteSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['note', 'whisper'],
    default: 'note',
  },
  whisperTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  visibility: {
    type: String,
    enum: ['all_agents', 'supervisors_only', 'assigned_only'],
    default: 'all_agents',
  },
  isImportant: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
  }],
  readBy: [{
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },
    readAt: Date,
  }],
}, {
  timestamps: true,
});

// Index for faster queries
internalNoteSchema.index({ chatId: 1, createdAt: -1 });
internalNoteSchema.index({ ticketId: 1, createdAt: -1 });
internalNoteSchema.index({ agentId: 1 });

module.exports = mongoose.model('InternalNote', internalNoteSchema);
