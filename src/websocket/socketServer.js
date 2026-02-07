const socketIO = require('socket.io');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const mongoose = require('mongoose');

let io = null;

const initializeSocketServer = (server) => {
  io = socketIO(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005'
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Agent connection
    socket.on('agent:connect', (data) => {
      console.log('Agent connected:', data.agentId);
      socket.data.userId = data.agentId;
      socket.data.userType = 'agent';
      socket.join(`agent:${data.agentId}`);

      io.emit('agent:status', {
        agentId: data.agentId,
        status: 'online',
      });
    });

    // Visitor connection
    socket.on('visitor:connect', async (data) => {
      console.log('Visitor connected:', data.visitorId);
      socket.data.userId = data.visitorId;
      socket.data.userType = 'visitor';
      socket.data.sessionId = data.sessionId;

      // Update visitor online status
      await Visitor.findByIdAndUpdate(data.visitorId, {
        online: true,
        lastSeen: new Date(),
        ...(data.fingerprint && { fingerprint: data.fingerprint })
      });

      socket.join(`visitor:${data.visitorId}`);

      // Handle multi-tab: broadcast to other tabs of the same visitor if needed
      // Actually Socket.io rooms handle this well if they all join the same room.

      io.emit('visitor:online', {
        visitorId: data.visitorId,
        sessionId: data.sessionId,
      });

      // Auto-join active chat if exists
      const activeChat = await Chat.findOne({ visitorId: data.visitorId, status: { $in: ['pending', 'active'] } });
      if (activeChat) {
        socket.join(`chat:${activeChat._id}`);
        socket.data.chatId = activeChat._id;
        socket.emit('chat:active', activeChat);
      }
    });

    // Join chat room
    socket.on('chat:join', (data) => {
      console.log('Joining chat:', data.chatId);
      socket.data.chatId = data.chatId;
      socket.join(`chat:${data.chatId}`);

      // If user is an agent, also join the internal room for this chat
      if (socket.data.userType === 'agent') {
        socket.join(`chat:${data.chatId}:internal`);
      }
    });

    // Leave chat room
    socket.on('chat:leave', (data) => {
      console.log('Leaving chat:', data.chatId);
      socket.leave(`chat:${data.chatId}`);
      if (socket.data.userType === 'agent') {
        socket.leave(`chat:${data.chatId}:internal`);
      }
      socket.data.chatId = undefined;
    });

    // Assign chat to agent
    socket.on('chat:assign', async (data) => {
      const { chatId, agentId } = data;
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        chat.agentId = agentId;
        chat.status = 'active';
        chat.startTime = chat.startTime || new Date();
        await chat.save();

        const Agent = require('../models/Agent');
        await Agent.findByIdAndUpdate(agentId, { $inc: { currentChats: 1, totalChats: 1 } });

        const populatedChat = await Chat.findById(chatId)
          .populate('agentId', 'name displayName avatar')
          .populate('visitorId', 'name email');

        io.to(`chat:${chatId}`).emit('chat:updated', populatedChat);
        io.to(`chat:${chatId}`).emit('chat:assigned', populatedChat);

        // Ensure assigning agent joins rooms
        socket.join(`chat:${chatId}`);
        socket.join(`chat:${chatId}:internal`);

      } catch (error) {
        console.error('Assign error:', error);
      }
    });

    // Complete chat
    socket.on('chat:complete', async (data) => {
      const { chatId } = data;
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || chat.status === 'completed') return;

        chat.status = 'completed';
        chat.endTime = new Date();
        await chat.save();

        if (chat.agentId) {
          const Agent = require('../models/Agent');
          await Agent.findByIdAndUpdate(chat.agentId, { $inc: { currentChats: -1 } });
        }

        const sysMsg = await Message.create({
          chatId,
          senderId: 'system',
          senderType: 'system',
          content: 'This conversation has ended.',
          isInternal: false
        });

        io.to(`chat:${chatId}`).emit('message:new', sysMsg);
        io.to(`chat:${chatId}`).emit('chat:completed', chat);
      } catch (error) {
        console.error('Complete error:', error);
      }
    });

    // Send message with ACK
    socket.on('message:send', async (data, callback) => {
      console.log('New message:', data);

      try {
        // Non-blocking user activity updates
        if (data.senderType === 'visitor') {
          Visitor.findByIdAndUpdate(data.senderId, { online: true, lastSeen: new Date() }).catch(err => console.error('Visitor update error:', err));
        } else if (mongoose.Types.ObjectId.isValid(data.senderId)) {
          const Agent = require('../models/Agent');
          Agent.findByIdAndUpdate(data.senderId, { lastSeen: new Date() }).catch(err => console.error('Agent update error:', err));
        }

        if (data.isInternal && data.senderType !== 'agent') {
          data.isInternal = false;
        }

        const message = await Message.create({
          chatId: data.chatId,
          senderId: data.senderId,
          senderType: data.senderType,
          content: data.content,
          type: data.type || 'text',
          isInternal: data.isInternal || false,
          clientId: data.clientId // Save clientId for frontend duplicate detection
        });

        // Emit message immediately after creation
        if (message.isInternal) {
          io.to(`chat:${data.chatId}:internal`).emit('message:new', message);
        } else {
          io.to(`chat:${data.chatId}`).emit('message:new', message);
        }

        // Return acknowledgment to sender immediately
        if (callback) callback({ success: true, message });

        // Secondary non-blocking updates and notifications
        Chat.findByIdAndUpdate(data.chatId, { lastMessageAt: new Date() }).catch(err => console.error('Chat update error:', err));

        // Background notification logic
        setImmediate(async () => {
          try {
            io.emit('agent:notification', {
              type: 'message',
              chatId: data.chatId,
              message,
            });

            const chat = await Chat.findById(data.chatId).select('agentId');
            if (chat && chat.agentId) {
              io.to(`agent:${chat.agentId}`).emit('message:notification', {
                chatId: data.chatId,
                message,
              });
            }
          } catch (err) {
            console.error('Notification logic error:', err);
          }
        });

      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) callback({ success: false, error: 'Failed to send message' });
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });



    // Typing Indicators
    socket.on('typing:start', (data) => {
      const { chatId, userId, userType } = data;
      socket.to(`chat:${chatId}`).emit('typing:indicator', {
        chatId,
        userId,
        userType,
        isTyping: true
      });
    });

    socket.on('typing:stop', (data) => {
      const { chatId, userId, userType } = data;
      socket.to(`chat:${chatId}`).emit('typing:indicator', {
        chatId,
        userId,
        userType,
        isTyping: false
      });
    });

    // Message Delivered
    socket.on('message:delivered', async (data) => {
      const { chatId, messageId, deliveredTo, userType } = data;
      try {
        // Update specific message or all SENT messages in chat if messageId is not provided
        // We only update if status is 'SENT' (don't downgrade from SEEN)
        if (messageId) {
          await Message.updateOne(
            { _id: messageId, status: 'SENT' },
            { status: 'DELIVERED', deliveredAt: new Date() }
          );
        } else {
          // Mark all SENT messages as DELIVERED for this chat where sender is NOT the one delivering it
          await Message.updateMany(
            { chatId, senderType: { $ne: userType }, status: 'SENT' },
            { status: 'DELIVERED', deliveredAt: new Date() }
          );
        }

        // Broadcast status update
        io.to(`chat:${chatId}`).emit('message:status_update', {
          chatId,
          messageId, // might be null if bulk
          status: 'DELIVERED',
          userType,
          deliveredAt: new Date()
        });

      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    // Message Seen
    socket.on('message:seen', async (data) => {
      const { chatId, messageId, seenBy, userType } = data;
      try {
        const updateData = { status: 'SEEN', seenAt: new Date(), read: true };

        // Update specific message or all unseen messages
        if (messageId) {
          await Message.findByIdAndUpdate(messageId, updateData);
        } else {
          // Mark all messages as SEEN for this chat where sender is NOT the one seeing it
          await Message.updateMany(
            { chatId, senderType: { $ne: userType }, status: { $ne: 'SEEN' } },
            updateData
          );
        }

        // Broadcast to everyone in the chat
        io.to(`chat:${chatId}`).emit('message:status_update', {
          chatId,
          messageId,
          status: 'SEEN',
          seenBy,
          userType,
          seenAt: new Date()
        });

        // Also emit legacy event if needed, but status_update should cover it
        // io.to(`chat:${chatId}`).emit('message:seen', ...); 

      } catch (error) {
        console.error('Error marking message as seen:', error);
      }
    });

    // Heartbeat
    socket.on('heartbeat', async () => {
      const { userId, userType } = socket.data;
      if (userId) {
        if (userType === 'visitor') {
          await Visitor.findByIdAndUpdate(userId, { lastSeen: new Date(), online: true });
        } else if (userType === 'agent') {
          const Agent = require('../models/Agent');
          await Agent.findByIdAndUpdate(userId, { lastSeen: new Date() });
        }
      }
    });

    // Supervisor Takeover
    socket.on('agent:takeover', async (data) => {
      const { chatId, supervisorId } = data;
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const oldAgentId = chat.agentId;
        chat.agentId = supervisorId;
        chat.status = 'active';
        await chat.save();

        const Agent = require('../models/Agent');
        if (oldAgentId) {
          await Agent.findByIdAndUpdate(oldAgentId, { $inc: { currentChats: -1 } });
        }
        await Agent.findByIdAndUpdate(supervisorId, { $inc: { currentChats: 1, totalChats: 1 } });

        const populatedChat = await Chat.findById(chatId)
          .populate('agentId', 'name displayName avatar')
          .populate('visitorId', 'name email');

        io.to(`chat:${chatId}`).emit('chat:updated', populatedChat);
        io.to(`chat:${chatId}`).emit('chat:assigned', populatedChat);

        // Notify old agent
        if (oldAgentId) {
          io.to(`agent:${oldAgentId}`).emit('chat:taken_over', { chatId, supervisorId });
        }

        // System message for takeover
        const sysMsg = await Message.create({
          chatId,
          senderId: 'system',
          senderType: 'system',
          content: 'A supervisor has taken over this conversation.',
          isInternal: false
        });
        io.to(`chat:${chatId}`).emit('message:new', sysMsg);

      } catch (error) {
        console.error('Takeover error:', error);
      }
    });

    // Agent Direct Message (Internal Chat)
    socket.on('agent:direct_message', async (data) => {
      const { senderId, receiverId, content } = data;
      // This is a simplified version - in a production app, you'd store this in a DirectMessage model
      io.to(`agent:${receiverId}`).emit('agent:direct_message', {
        senderId,
        content,
        sentAt: new Date()
      });
      socket.emit('agent:direct_message', {
        senderId,
        receiverId,
        content,
        sentAt: new Date(),
        delivered: true
      });
    });

    // Disconnect with Grace Period
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      const { userId, userType } = socket.data;
      if (!userId) return;

      // Stop typing if they were typing
      if (socket.data.chatId) {
        io.to(`chat:${socket.data.chatId}`).emit('typing:indicator', {
          chatId: socket.data.chatId,
          userId,
          userType,
          isTyping: false
        });
      }

      // Wait 5 seconds to see if they reconnect before marking offline
      setTimeout(async () => {
        // Check if user has any other active connections
        const remainingSockets = await io.fetchSockets();
        const isStillConnected = remainingSockets.some(s => s.data.userId === userId);

        if (!isStillConnected) {
          if (userType === 'visitor') {
            await Visitor.findByIdAndUpdate(userId, { online: false });
            io.emit('visitor:offline', { visitorId: userId });
          } else if (userType === 'agent') {
            const Agent = require('../models/Agent');
            await Agent.findByIdAndUpdate(userId, { status: 'offline' });

            io.emit('agent:status', {
              agentId: userId,
              status: 'offline',
            });
          }
        }
      }, 5000);
    });
  });

  console.log('WebSocket server initialized');
  return io;
};

const getIO = () => io;

module.exports = { initializeSocketServer, getIO };
