const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  permissions: {
    canViewAllChats: {
      type: Boolean,
      default: false,
    },
    canManageAgents: {
      type: Boolean,
      default: false,
    },
    canManageSettings: {
      type: Boolean,
      default: false,
    },
    canViewAnalytics: {
      type: Boolean,
      default: false,
    },
    canExportData: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Role', roleSchema);
