const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  email: String,
  phone: String,
  reason: String,
  ipAddress: String,
  country: String,
  city: String,
  browser: String,
  os: String,
  device: String,
  userAgent: String,
  referrer: String,
  currentPage: String,
  landingPage: String,
  online: {
    type: Boolean,
    default: false,
  },
  lastVisit: {
    type: Date,
    default: Date.now,
  },
  firstVisit: {
    type: Date,
    default: Date.now,
  },
  numVisits: {
    type: Number,
    default: 1,
  },
  numChats: {
    type: Number,
    default: 0,
  },
  customData: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Visitor', visitorSchema);
