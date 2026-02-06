const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const Agent = require('../models/Agent');
const IssueCategory = require('../models/IssueCategory');
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
           // Agents can see chats assigned to them OR unassigned chats
           filter.$or = [
               { agentId: currentAgent._id },
               { agentId: null }
           ];
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
      .populate({
        path: 'visitorId',
        select: 'name email sessionId subscriptionId',
        populate: { path: 'subscriptionId' }
      })
      .populate('agentId', 'name displayName avatar rating tagline') 
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
    const { visitorId, departmentId, categoryId } = req.body;

    // Verify visitor exists and populate subscription
    const visitor = await Visitor.findById(visitorId).populate('subscriptionId');
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const priorityLevel = visitor.subscriptionId ? visitor.subscriptionId.priorityLevel : 1;
    const isPremium = priorityLevel > 1;

    // Calculate Queue Position
    const pendingQuery = { 
        status: 'pending',
        priorityLevel: { $gte: priorityLevel }
    };
    if (departmentId) pendingQuery.departmentId = departmentId;
    if (categoryId) pendingQuery.categoryId = categoryId;
    
    let queuePosition = await Chat.countDocuments(pendingQuery) + 1;
    
    const estimatedWaitTime = queuePosition * 2 * 60; // seconds

    // Create chat
    const chat = await Chat.create({
      visitorId,
      departmentId,
      categoryId,
      status: 'pending',
      queuePosition,
      estimatedWaitTime,
      priorityLevel,
      isPremium,
    });

    // Update visitor chat count
    visitor.numChats += 1;
    await visitor.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate({
          path: 'visitorId',
          select: 'name email sessionId subscriptionId',
          populate: { path: 'subscriptionId' }
      })
      .populate('departmentId', 'name');

    res.status(201).json({
      success: true,
      chat: populatedChat,
      queuePosition,
      estimatedWaitTime,
      priorityLevel,
      isPremium,
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
      .populate({
        path: 'visitorId',
        populate: { path: 'subscriptionId' }
      })
      .populate('agentId', 'name displayName avatar rating tagline') 
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
    const { agentId, status, satisfaction, tags, notes, departmentId, onHold } = req.body;

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Update fields
    if (agentId !== undefined) {
      if (agentId && agentId !== String(chat.agentId)) {
        const targetAgent = await Agent.findById(agentId);
        if (!targetAgent) return res.status(404).json({ error: 'Agent not found' });

        // 1. Capacity Check
        if (targetAgent.currentChats >= targetAgent.chatLimit) {
            return res.status(400).json({ 
                success: false, 
                message: `Agent ${targetAgent.name} has reached their concurrent chat limit (${targetAgent.chatLimit}).` 
            });
        }

        // 2. Skill Check
        if (chat.categoryId) {
            const category = await IssueCategory.findById(chat.categoryId);
            if (category && category.requiredSkills && category.requiredSkills.length > 0) {
                const hasAllSkills = category.requiredSkills.every(skill => 
                    targetAgent.skills && targetAgent.skills.includes(skill)
                );
                if (!hasAllSkills) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Agent ${targetAgent.name} lacks the required skills (${category.requiredSkills.join(', ')}) for this chat category.` 
                    });
                }
            }
        }
      }

      // Update agent chat counts
      if (chat.agentId && String(chat.agentId) !== agentId) {
        await Agent.findByIdAndUpdate(chat.agentId, { $inc: { currentChats: -1 } });
      }
      if (agentId && String(chat.agentId) !== agentId) {
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
    if (onHold !== undefined) chat.onHold = onHold;

    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate('visitorId')
      .populate('agentId', 'name displayName avatar rating tagline') // Added rating and tagline
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
