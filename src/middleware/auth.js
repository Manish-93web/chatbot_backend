const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

const protect = async (req, res, next) => {
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

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.agent || !req.agent.roleId) {
      return res.status(403).json({ error: 'User role not found' });
    }

    // Check if role name matches (case-insensitive for convenience)
    const roleName = req.agent.roleId.name.toLowerCase();
    const authorized = roles.some(role => role.toLowerCase() === roleName);

    if (!authorized) {
      return res.status(403).json({ 
        error: `Agent role ${req.agent.roleId.name} is not authorized to access this route` 
      });
    }
    next();
  };
};

const auth = protect;
auth.protect = protect;
auth.authorize = authorize;

module.exports = auth;
