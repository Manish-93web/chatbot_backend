const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderType: {
    type: String,
    enum: ['agent', 'visitor', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text',
  },
  fileUrl: String,
  fileName: String,
  read: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  isInternal: {
    type: Boolean,
    default: false,
  },
  whisperTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  translated: {
    content: String,
    language: String,
    provider: String,
  },
  detectedLanguage: String,
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
}, {
  timestamps: true,
});

// Index for faster queries
messageSchema.index({ chatId: 1, sentAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
