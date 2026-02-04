const Agent = require('../models/Agent');

// @desc    Get all agents
// @route   GET /api/agents
// @access  Private
exports.getAgents = async (req, res) => {
  try {
    const { departmentId, enabled } = req.query;
    
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const agents = await Agent.find(filter)
      .populate('roleId departmentId')
      .select('-password');

    res.json({
      success: true,
      agents,
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Create agent
// @route   POST /api/agents
// @access  Private
exports.createAgent = async (req, res) => {
  try {
    // Set plainPassword for Admin visibility
    req.body.plainPassword = req.body.password;

    const agent = await Agent.create(req.body);

    res.status(201).json({
      success: true,
      agent: agent.toJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get agent by ID
// @route   GET /api/agents/:id
// @access  Private
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('roleId departmentId')
      .select('-password');

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update agent
// @route   PUT /api/agents/:id
// @access  Private
exports.updateAgent = async (req, res) => {
  try {
    // If password is being updated, update plainPassword too
    if (req.body.password) {
      req.body.plainPassword = req.body.password;
    }

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('roleId departmentId').select('-password');

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get agent metadata (roles, departments)
// @route   GET /api/agents/metadata
// @access  Private
exports.getMetadata = async (req, res) => {
  try {
    const Role = require('../models/Role');
    const Department = require('../models/Department');

    const roles = await Role.find({});
    const departments = await Department.find({});

    res.json({
      success: true,
      roles,
      departments,
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete agent
// @route   DELETE /api/agents/:id
// @access  Private
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = exports;
