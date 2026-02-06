const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Free', 'Silver', 'Gold', 'Platinum'],
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  priorityLevel: {
    type: Number,
    required: true,
    default: 1, // Higher is better
  },
  features: {
    maxAgents: { type: Number, default: 1 },
    historyDays: { type: Number, default: 7 },
    analytics: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    fileSharing: { type: Boolean, default: true },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
