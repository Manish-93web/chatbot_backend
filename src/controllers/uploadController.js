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

    // MOCK VIRUS SCANNING
    const isClean = true; // Simulation
    if (!isClean) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'File rejected: Virus detected (Mock)' });
    }

    // Log audit
    // Mandatory Audit for File Upload
    const requesterId = req.headers['x-visitor-id'] || req.user?.id || 'anonymous';
    const requesterType = req.user ? 'agent' : 'visitor';

    await logAudit(
      requesterId,
      requesterType,
      'file_upload',
      'file',
      null,
      {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        scanResult: 'clean'
      }
    );

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
