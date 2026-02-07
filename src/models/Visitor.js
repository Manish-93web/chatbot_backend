const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String, // ID from the main store/app if logged in
    index: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verificationCode: String,
  verificationExpires: Date,
  fingerprint: String, // Device fingerprint
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
  isBanned: {
    type: Boolean,
    default: false,
  },
  gdprConsent: {
    type: Boolean,
    default: false,
  },
  consentTimestamp: Date,
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  warranty: {
    serialNumber: String,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['valid', 'expired', 'none'],
      default: 'none',
    },
  },
  language: {
    type: String,
    default: 'en',
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Visitor', visitorSchema);
