const mongoose = require('mongoose');

const slaConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    required: true,
  },
  firstResponseTime: {
    type: Number, // in minutes
    required: true,
  },
  resolutionTime: {
    type: Number, // in minutes
    required: true,
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00',
    },
    end: {
      type: String,
      default: '18:00',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  workingDays: {
    type: [Number], // 0-6 (Sunday-Saturday)
    default: [1, 2, 3, 4, 5], // Monday-Friday
  },
  holidays: [{
    date: Date,
    name: String,
  }],
  escalationRules: [{
    level: {
      type: Number,
      required: true,
    },
    afterMinutes: {
      type: Number,
      required: true,
    },
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'escalationRules.assignToModel',
    },
    assignToModel: {
      type: String,
      enum: ['Agent', 'Department'],
    },
    notifyEmails: [String],
  }],
  enabled: {
    type: Boolean,
    default: true,
  },
  applyTo: {
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
    categories: [String],
  },
}, {
  timestamps: true,
});

// Index for faster queries
slaConfigSchema.index({ priority: 1, enabled: 1 });

module.exports = mongoose.model('SLAConfig', slaConfigSchema);
