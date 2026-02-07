const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { getIO } = require('../websocket/socketServer');

const jwt = require('jsonwebtoken'); // Import jwt
const Agent = require('../models/Agent'); // Import Agent model

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Public (filtered) / Private (full)
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Manual Auth Check to determine visibility
    let isAgent = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Verify agent exists
        const agent = await Agent.findById(decoded.id);
        if (agent) isAgent = true;
      } catch (err) {
        // Invalid token, treat as visitor/public
      }
    }

    const filter = { chatId };
    if (!isAgent) {
      // Visitors cannot see internal notes
      filter.isInternal = { $ne: true };
    }

    let messages = await Message.find(filter).sort({ sentAt: 1 });

    // Apply PII masking if needed
    // Assuming we have a permission 'canViewPII'
    const agent = isAgent ? await Agent.findById(req.agent?._id).populate('roleId') : null;
    const canViewPII = agent?.roleId?.permissions?.canViewPII ?? true; // Default to true if not defined to avoid breaking changes

    if (isAgent && !canViewPII) {
      const { maskPII } = require('../utils/securityUtils');
      messages = messages.map(msg => {
        const msgObj = msg.toObject();
        msgObj.content = maskPII(msgObj.content);
        return msgObj;
      });
    }

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/messages/:chatId
// @access  Public/Private
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, senderType, content, type, clientId } = req.body;

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Duplicate Check (by clientId)
    if (clientId) {
      const existingMessage = await Message.findOne({ chatId, clientId });
      if (existingMessage) {
        return res.status(200).json({
          success: true,
          message: existingMessage,
          isDuplicate: true
        });
      }
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId,
      senderType,
      content,
      type: type || 'text',
      clientId
    });

    // Handle First Response Time (FRT)
    if (senderType === 'agent' && !chat.firstResponseAt) {
      const firstResponseAt = new Date();
      const firstResponseTime = Math.floor((firstResponseAt - chat.startTime) / 1000);

      await Chat.findByIdAndUpdate(chatId, {
        firstResponseAt,
        firstResponseTime
      });

      // Update local chat object for socket notifications if needed
      chat.firstResponseAt = firstResponseAt;
      chat.firstResponseTime = firstResponseTime;
    }

    // Socket.io Real-time updates
    const io = getIO();
    if (io) {
      // Broadcast to chat room (for visitor and agent in the chat)
      io.to(`chat:${chatId}`).emit('message:new', message);

      // Send notifications to agents (dashboard)
      io.emit('agent:notification', {
        type: 'message',
        chatId,
        message,
      });

      // Specific notifications for assigned agent
      if (chat.agentId) {
        io.to(`agent:${chat.agentId}`).emit('message:notification', {
          chatId,
          message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update a message
// @route   PUT /api/messages/:id
// @access  Private (Agent)
exports.updateMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const oldContent = message.content;
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Log audit
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user?.id && req.user.id !== 'anonymous' ? req.user.id : undefined,
      userType: 'agent',
      action: 'update',
      resource: 'message',
      resourceId: message._id,
      changes: { before: { content: oldContent }, after: { content } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Socket broadcast
    const io = getIO();
    if (io) {
      io.to(`chat:${message.chatId}`).emit('message:update', message);
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private (Agent)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const chatId = message.chatId;
    await message.deleteOne();

    // Log audit
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user?.id && req.user.id !== 'anonymous' ? req.user.id : undefined,
      userType: 'agent',
      action: 'delete',
      resource: 'message',
      resourceId: req.params.id,
      changes: { before: { content: message.content } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Socket broadcast
    const io = getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit('message:delete', { messageId: req.params.id });
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
