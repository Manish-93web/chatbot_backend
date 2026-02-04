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
}, {
  timestamps: true,
});

// Index for faster queries
messageSchema.index({ chatId: 1, sentAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
