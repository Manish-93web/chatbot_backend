const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userType: {
    type: String,
    enum: ['agent', 'admin', 'system', 'visitor'],
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'failed_login',
      'create', 'update', 'delete', 'view',
      'assign', 'transfer', 'escalate',
      'status_change', 'priority_change',
      'export', 'import',
      'settings_change', 'permission_change',
      'file_upload', 'file_download',
      'chat_start', 'chat_end',
      'ticket_create', 'ticket_close',
      'note_add', 'rating_submit',
    ],
  },
  resource: {
    type: String,
    required: true,
    enum: ['chat', 'ticket', 'agent', 'visitor', 'department', 'role', 'settings', 'file', 'message', 'note', 'rating'],
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },
  success: {
    type: Boolean,
    default: true,
  },
  errorMessage: String,
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Index for faster queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// TTL index for automatic deletion after 1 year (optional)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
