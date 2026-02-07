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

// @desc    Update agent status
// @route   PUT /api/agents/:id/status
// @access  Private
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['online', 'busy', 'away', 'wrap-up', 'offline'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { status, lastStatusChange: new Date(), lastSeen: new Date() },
      { new: true }
    ).select('-password');

    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Broadcast status change
    const io = require('../websocket/socketServer').getIO();
    if (io) {
      io.emit('agent:status', { agentId: agent._id, status });
    }

    res.json({ success: true, agent });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Start / End break
// @route   POST /api/agents/:id/break
// @access  Private
exports.handleBreak = async (req, res) => {
  try {
    const { type, action } = req.body; // type: lunch/short, action: start/end
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (action === 'start') {
      agent.breaks.push({ type, start: new Date(), isOver: false });
      agent.status = 'away';
    } else {
      const activeBreak = agent.breaks.find(b => !b.isOver);
      if (activeBreak) {
        activeBreak.end = new Date();
        activeBreak.isOver = true;
      }
      agent.status = 'online';
    }

    agent.lastStatusChange = new Date();
    await agent.save();

    res.json({ success: true, agent });
  } catch (error) {
    console.error('Handle break error:', error);
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
