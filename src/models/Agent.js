const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  avatar: String,
  tagline: String,
  skills: [String],
  chatLimit: {
    type: Number,
    default: 5,
  },
  currentChats: {
    type: Number,
    default: 0,
  },
  totalChats: {
    type: Number,
    default: 0,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  online: {
    type: Boolean,
    default: false,
  },
  lastLogin: Date,
  preferences: {
    language: {
      type: String,
      default: 'en',
    },
    offlineMessageNotifications: {
      type: Boolean,
      default: true,
    },
    emailReports: {
      type: Boolean,
      default: true,
    },
  },
  idleTimeout: {
    type: Number,
    default: 10,
  },
}, {
  timestamps: true,
});

// Hash password before saving
agentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
agentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
agentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Agent', agentSchema);
