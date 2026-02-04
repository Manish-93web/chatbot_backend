const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get agent from database
    const agent = await Agent.findById(decoded.id).select('-password').populate('roleId');
    
    if (!agent) {
      return res.status(401).json({ error: 'Agent not found' });
    }

    // if (!agent.enabled) {
    //   return res.status(401).json({ error: 'Account disabled' });
    // }

    // Attach agent to request
    req.agent = agent;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Export as both default function and named property 'protect'
authMiddleware.protect = authMiddleware;
module.exports = authMiddleware;
