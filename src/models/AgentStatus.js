const mongoose = require('mongoose');

const agentStatusSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['online', 'busy', 'away', 'offline'],
    default: 'offline',
  },
  statusMessage: {
    type: String,
    maxlength: 100,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  currentChats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  }],
  availableForNewChats: {
    type: Boolean,
    default: true,
  },
  maxConcurrentChats: {
    type: Number,
    default: 5,
  },
  autoAwayAfterMinutes: {
    type: Number,
    default: 10,
  },
  breakStatus: {
    onBreak: {
      type: Boolean,
      default: false,
    },
    breakType: {
      type: String,
      enum: ['lunch', 'short', 'meeting', 'other'],
    },
    breakStartedAt: Date,
    expectedReturnAt: Date,
  },
  shiftInfo: {
    currentShift: {
      start: String,
      end: String,
    },
    isInShift: {
      type: Boolean,
      default: false,
    },
  },
  deviceInfo: {
    browser: String,
    os: String,
    lastIp: String,
  },
}, {
  timestamps: true,
});

// Auto-update lastActivity on status change
agentStatusSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.lastActivity = new Date();
  }
  next();
});

// Index for faster queries
agentStatusSchema.index({ agentId: 1 });
agentStatusSchema.index({ status: 1, availableForNewChats: 1 });

module.exports = mongoose.model('AgentStatus', agentStatusSchema);
