const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const Agent = require('../models/Agent');
const jwt = require('jsonwebtoken'); // Import jwt for manual verification

// @desc    Get all chats
// @route   GET /api/chats
// @access  Private
exports.getChats = async (req, res) => {
  try {
    const { status, agentId, visitorId } = req.query;
    
    // Manual Auth Check
    let currentAgent = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            currentAgent = await Agent.findById(decoded.id).populate('roleId');
        } catch (err) {
            // Invalid token, treat as unauthenticated
        }
    }

    const filter = {};
    if (status) filter.status = status;
    if (agentId) filter.agentId = agentId;
    if (visitorId) filter.visitorId = visitorId;

    if (currentAgent) {
       // Authenticated Agent
       // Standard dashboard access: can filter by status/agentId etc.
       // RBAC Check
       if (currentAgent.roleId && !currentAgent.roleId.permissions.canViewAllChats) {
           filter.agentId = currentAgent._id;
       }
    } else {
       // Unauthenticated (Widget or Public)
       // MUST provide visitorId to see history
       if (!visitorId) {
           return res.status(401).json({ error: 'Unauthorized. Visitor ID required.' });
       }
       // If visitorId provided, we rely on the filter implicitly set above: filter.visitorId = visitorId
    }

    const chats = await Chat.find(filter)
      .populate('visitorId', 'name email sessionId')
      .populate('agentId', 'name displayName avatar')
      .populate('departmentId', 'name')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Create new chat
// @route   POST /api/chats
// @access  Public
exports.createChat = async (req, res) => {
  try {
    const { visitorId, departmentId } = req.body;

    // Verify visitor exists
    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Create chat
    const chat = await Chat.create({
      visitorId,
      departmentId,
      status: 'pending',
    });

    // Update visitor chat count
    visitor.numChats += 1;
    await visitor.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate('visitorId', 'name email sessionId')
      .populate('departmentId', 'name');

    res.status(201).json({
      success: true,
      chat: populatedChat,
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get chat by ID
// @route   GET /api/chats/:id
// @access  Private
exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('visitorId')
      .populate('agentId', 'name displayName avatar')
      .populate('departmentId', 'name');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update chat
// @route   PUT /api/chats/:id
// @access  Private
exports.updateChat = async (req, res) => {
  try {
    const { agentId, status, satisfaction, tags, notes, departmentId } = req.body;

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Update fields
    if (agentId !== undefined) {
      // Update agent chat counts
      if (chat.agentId) {
        await Agent.findByIdAndUpdate(chat.agentId, { $inc: { currentChats: -1 } });
      }
      if (agentId) {
        await Agent.findByIdAndUpdate(agentId, { $inc: { currentChats: 1, totalChats: 1 } });
      }
      chat.agentId = agentId;
    }
    
    if (status !== undefined) {
      chat.status = status;
      if (status === 'completed' && !chat.endTime) {
        chat.endTime = new Date();
      }
    }
    
    if (satisfaction !== undefined) chat.satisfaction = satisfaction;
    if (tags !== undefined) chat.tags = tags;
    if (notes !== undefined) chat.notes = notes;
    if (departmentId !== undefined) chat.departmentId = departmentId;

    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('visitorId')
      .populate('agentId', 'name displayName avatar')
      .populate('departmentId', 'name');

    res.json({
      success: true,
      chat: updatedChat,
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:id
// @access  Private
exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
