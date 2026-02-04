const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { getIO } = require('../websocket/socketServer');

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await Message.find({ chatId }).sort({ sentAt: 1 });

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
    const { senderId, senderType, content, type } = req.body;

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId,
      senderType,
      content,
      type: type || 'text',
    });

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
