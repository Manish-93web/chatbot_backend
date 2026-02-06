const mongoose = require('mongoose');

const shortcutSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  message: {
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
  tag: {
    type: String,
    default: 'general',
  },
  isShared: {
    type: Boolean,
    default: false
  },
  // Legacy fields, keeping just in case
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  }],
}, {
  timestamps: true,
});

// Compound index to ensure uniqueness per scope
// 1. Personal: agentId + keyword
// 2. Shared: departmentId + keyword (if we scope by department)
// For now, let's just make sure agentId + keyword is unique.
shortcutSchema.index({ agentId: 1, keyword: 1 }, { unique: true, partialFilterExpression: { agentId: { $exists: true } } });

module.exports = mongoose.model('Shortcut', shortcutSchema);
