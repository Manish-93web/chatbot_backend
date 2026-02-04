const mongoose = require('mongoose');

const shortcutSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  message: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    default: 'general',
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  }],
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Shortcut', shortcutSchema);
