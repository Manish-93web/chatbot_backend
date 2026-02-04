const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

// @desc    Login agent
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find agent by email
    const agent = await Agent.findOne({ email }).populate('roleId departmentId');

    if (!agent) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is enabled
    if (!agent.enabled) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isMatch = await agent.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    agent.lastLogin = new Date();
    agent.online = true;
    await agent.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: agent._id, email: agent.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      agent: agent.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Logout agent
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Update agent online status
    await Agent.findByIdAndUpdate(req.agent._id, { online: false });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get current agent
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.agent._id)
      .populate('roleId departmentId')
      .select('-password');

    res.json({
      success: true,
      agent,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update agent profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const agent = await Agent.findById(req.agent._id);
    if (!agent) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.body.name) agent.name = req.body.name;
    if (req.body.email) agent.email = req.body.email;
    if (req.body.password) agent.password = req.body.password;

    await agent.save();

    res.json({
      success: true,
      user: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.roleId,
        department: agent.departmentId,
        avatar: agent.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
