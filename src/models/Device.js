const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  brand: {
    type: String,
    required: true,
    index: true,
  },
  model: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['printer', 'laptop', 'smartphone', 'router', 'other'],
    default: 'other',
  },
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated'],
    default: 'active',
  }
}, {
  timestamps: true,
});

deviceSchema.index({ brand: 1, model: 1 });

module.exports = mongoose.model('Device', deviceSchema);
