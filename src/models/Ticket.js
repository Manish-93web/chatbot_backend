const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true,
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  },
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'waiting_visitor', 'escalated', 'resolved', 'closed'],
    default: 'open',
  },
  channel: {
    type: String,
    enum: ['web', 'email', 'sms', 'whatsapp'],
    default: 'web',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  category: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  deviceInfo: {
    brand: String,
    model: String,
    version: String,
    serialNumber: String,
  },
  sla: {
    responseBy: Date,
    resolveBy: Date,
    breached: {
      type: Boolean,
      default: false,
    },
    breachReason: String,
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3, // L0, L1, L2, L3
  },
  escalationHistory: [{
    level: Number,
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },
    reason: String,
    escalatedAt: Date,
  }],
  mergedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  }],
  splitFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  },
  relatedTickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  }],
  reopenCount: {
    type: Number,
    default: 0,
  },
  reopenHistory: [{
    reopenedBy: String, // visitor or agent ID
    reopenedAt: Date,
    reason: String,
  }],
  resolution: {
    summary: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },
    resolvedAt: Date,
    resolutionTime: Number, // in minutes
  },
  tags: [String],
  customFields: {
    type: Map,
    of: String,
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: String,
    uploadedAt: Date,
  }],
  firstResponseTime: Number, // in minutes
  firstResponseAt: Date,
  closedAt: Date,
}, {
  timestamps: true,
});

// Auto-generate ticket number
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate resolution time when ticket is resolved
ticketSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolution.resolvedAt) {
    this.resolution.resolvedAt = new Date();
    this.resolution.resolutionTime = Math.floor((this.resolution.resolvedAt - this.createdAt) / 60000);
  }
  next();
});

// Index for faster queries
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ visitorId: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ 'sla.resolveBy': 1, status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
