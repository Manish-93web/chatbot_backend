const mongoose = require('mongoose');

const issueCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: String,
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  defaultPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  requiredSkills: [String]
}, {
  timestamps: true,
});

module.exports = mongoose.model('IssueCategory', issueCategorySchema);
