const mongoose = require('mongoose');

const triggerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  enabled: {
    type: Boolean,
    default: true,
  },
  conditions: [{
    type: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  }],
  actions: [{
    type: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Trigger', triggerSchema);
