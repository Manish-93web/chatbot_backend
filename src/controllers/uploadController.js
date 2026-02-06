const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AuditLog = require('../models/AuditLog');

// Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Unique filename: timestamp + random + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4', 'video/webm' // Added video support for screen recording
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: Images, PDF, Docs, Excel, Text, Video (MP4/WebM)'), false);
  }
};

// Limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for video)
  }
});

// Helper to log audit
const logAudit = async (userId, userType, action, resource, resourceId, changes = {}) => {
  try {
    await AuditLog.create({
      userId,
      userType,
      action,
      resource,
      resourceId,
      changes,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// Upload handler
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;
    
    // Log audit
    // Optional: Log upload action if we have user context (might fail if auth not strictly enforced on this endpoint)
    if (req.user) {
        await logAudit(
            req.user.id,
            req.user.role ? 'agent' : 'visitor', // heuristic
            'file_upload',
            'file',
            null,
            { filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size }
        );
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

exports.uploadMiddleware = upload.single('file');
