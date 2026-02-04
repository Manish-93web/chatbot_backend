const mongoose = require('mongoose');

const widgetConfigSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: '#0ea5e9',
  },
  position: {
    type: String,
    enum: ['left', 'right'],
    default: 'right',
  },
  welcomeMessage: {
    type: String,
    default: 'Welcome! How can we help you today?',
  },
  offlineMessage: {
    type: String,
    default: 'We are currently offline. Please leave a message.',
  },
  showAgentPhotos: {
    type: Boolean,
    default: true,
  },
  requireEmail: {
    type: Boolean,
    default: false,
  },
  requireName: {
    type: Boolean,
    default: false,
  },
  enableFileUpload: {
    type: Boolean,
    default: true,
  },
  enableSoundNotifications: {
    type: Boolean,
    default: true,
  },
  customCSS: String,
  chatTitle: {
    type: String,
    default: 'Chat Support',
  },
  conciergeTitle: {
    type: String,
    default: 'Customer Support',
  },
  conciergeSubtitle: {
    type: String,
    default: 'We typically reply in a few minutes',
  },
  conciergeAvatar: String,
}, {
  timestamps: true,
});

module.exports = mongoose.model('WidgetConfig', widgetConfigSchema);
