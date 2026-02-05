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
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'missed'],
    default: 'pending',
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
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
  onHold: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Calculate duration when chat ends
chatSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
