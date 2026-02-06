const mongoose = require('mongoose');

const cannedResponseSchema = new mongoose.Schema({
  shortcut: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
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
  tags: [String],
}, {
  timestamps: true,
});

// Ensure shortcuts are unique per agent
cannedResponseSchema.index({ agentId: 1, shortcut: 1 }, { unique: true, partialFilterExpression: { agentId: { $exists: true } } });

module.exports = mongoose.model('CannedResponse', cannedResponseSchema);
