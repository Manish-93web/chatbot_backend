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
      
      // Update visitor online status
      await Visitor.findByIdAndUpdate(data.visitorId, { online: true });
      
      socket.join(`visitor:${data.visitorId}`);
      
      io.emit('visitor:online', {
        visitorId: data.visitorId,
        sessionId: data.sessionId,
      });
    });

    // Join chat room
    socket.on('chat:join', (data) => {
      console.log('Joining chat:', data.chatId);
      socket.data.chatId = data.chatId;
      socket.join(`chat:${data.chatId}`);
    });

    // Leave chat room
    socket.on('chat:leave', (data) => {
      console.log('Leaving chat:', data.chatId);
      socket.leave(`chat:${data.chatId}`);
      socket.data.chatId = undefined;
    });

    // Send message
    socket.on('message:send', async (data) => {
      console.log('New message:', data);

      try {
        // Ensure visitor is marked as online if they are sending a message
        if (data.senderType === 'visitor') {
          await Visitor.findByIdAndUpdate(data.senderId, { online: true });
        }
        // Create message in database
        const message = await Message.create({
          chatId: data.chatId,
          senderId: data.senderId,
          senderType: data.senderType,
          content: data.content,
          type: data.type || 'text',
        });

        // Broadcast to chat room
        io.to(`chat:${data.chatId}`).emit('message:new', message);

        // Send notifications to agents
        io.emit('agent:notification', {
          type: 'message',
          chatId: data.chatId,
          message,
        });

        // Specific notifications for joined agents
        const chat = await Chat.findById(data.chatId);
        if (chat) {
          if (chat.agentId) {
            io.to(`agent:${chat.agentId}`).emit('message:notification', {
              chatId: data.chatId,
              message,
            });
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      socket.to(`chat:${data.chatId}`).emit('typing:indicator', {
        chatId: data.chatId,
        userId: data.userId,
        userType: data.userType,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`chat:${data.chatId}`).emit('typing:indicator', {
        chatId: data.chatId,
        userId: data.userId,
        isTyping: false,
      });
    });

    // Chat assignment
    socket.on('chat:assign', async (data) => {
      console.log('Assigning chat:', data);

      try {
        const chat = await Chat.findByIdAndUpdate(
          data.chatId,
          { agentId: data.agentId, status: 'active' },
          { new: true }
        ).populate('visitorId agentId');

        if (chat) {
          io.to(`agent:${data.agentId}`).emit('chat:assigned', chat);
          io.to(`visitor:${chat.visitorId._id}`).emit('chat:agent_joined', {
            chatId: data.chatId,
            agentId: data.agentId,
          });
          io.emit('chat:updated', chat);
        }
      } catch (error) {
        console.error('Error assigning chat:', error);
        socket.emit('chat:error', { error: 'Failed to assign chat' });
      }
    });

    // Chat completion
    socket.on('chat:complete', async (data) => {
      console.log('Completing chat:', data);

      try {
        const chat = await Chat.findByIdAndUpdate(
          data.chatId,
          {
            status: 'completed',
            endTime: new Date(),
            satisfaction: data.satisfaction,
          },
          { new: true }
        );

        if (chat) {
          io.to(`chat:${data.chatId}`).emit('chat:completed', chat);
          io.emit('chat:updated', chat);
        }
      } catch (error) {
        console.error('Error completing chat:', error);
        socket.emit('chat:error', { error: 'Failed to complete chat' });
      }
    });

    // Agent status
    socket.on('agent:status', (data) => {
      console.log('Agent status change:', data);
      io.emit('agent:status', data);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);

      const { userId, userType } = socket.data;

      if (userType === 'visitor' && userId) {
        await Visitor.findByIdAndUpdate(userId, { online: false });
        io.emit('visitor:offline', { visitorId: userId });
      } else if (userType === 'agent' && userId) {
        io.emit('agent:status', {
          agentId: userId,
          status: 'offline',
        });
      }
    });
  });

  console.log('WebSocket server initialized');
  return io;
};

const getIO = () => io;

module.exports = { initializeSocketServer, getIO };
