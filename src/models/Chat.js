const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true,
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IssueCategory',
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'missed'],
    default: 'pending',
  },
  channel: {
    type: String,
    enum: ['web', 'email', 'sms', 'whatsapp'],
    default: 'web',
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  firstResponseAt: Date,
  firstResponseTime: Number, // in seconds from startTime to firstResponseAt
  endTime: Date,
  resolutionTime: Number, // in seconds from startTime to endTime
  duration: {
    type: Number,
    default: 0,
  },
  satisfaction: {
    type: Number,
    min: 1,
    max: 5,
  },
  tags: [String],
  notes: String,
  metadata: {
    type: Map,
    of: String,
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  },
  queuePosition: Number,
  estimatedWaitTime: Number, // in seconds
  onHold: {
    type: Boolean,
    default: false,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  transferHistory: [{
    fromAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    toAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    transferredAt: { type: Date, default: Date.now },
    transferredAt: { type: Date, default: Date.now },
    reason: String
  }],
  feedbackComment: String,
  resolutionStatus: {
    type: String,
    enum: ['resolved', 'unresolved', 'unknown'],
    default: 'unknown'
  },
  transcriptSent: {
    type: Boolean,
    default: false
  },
  priorityLevel: {
    type: Number,
    default: 1,
  },
  isPremium: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

// Calculate duration when chat ends
chatSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    this.resolutionTime = this.duration;
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
