const socketIO = require('socket.io');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');

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

    // Send message with ACK
    socket.on('message:send', async (data, callback) => {
      console.log('New message:', data);

      try {
        if (data.senderType === 'visitor') {
          await Visitor.findByIdAndUpdate(data.senderId, { online: true, lastSeen: new Date() });
        } else {
          const Agent = require('../models/Agent');
          await Agent.findByIdAndUpdate(data.senderId, { lastSeen: new Date() });
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
        });

        // Update chat activity
        await Chat.findByIdAndUpdate(data.chatId, { lastMessageAt: new Date() });

        if (message.isInternal) {
          io.to(`chat:${data.chatId}:internal`).emit('message:new', message);
        } else {
          io.to(`chat:${data.chatId}`).emit('message:new', message);
        }

        io.emit('agent:notification', {
          type: 'message',
          chatId: data.chatId,
          message,
        });

        const chat = await Chat.findById(data.chatId);
        if (chat && chat.agentId) {
          io.to(`agent:${chat.agentId}`).emit('message:notification', {
            chatId: data.chatId,
            message,
          });
        }

        // Send acknowledgment back to sender
        if (callback) callback({ success: true, messageId: message._id });

      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) callback({ success: false, error: 'Failed to send message' });
        socket.emit('message:error', { error: 'Failed to send message' });
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
