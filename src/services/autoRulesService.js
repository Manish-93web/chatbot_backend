const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { getIO } = require('../websocket/socketServer');

/**
 * Service to handle automated chat lifecycle rules
 */
const startAutoRulesService = () => {
    console.log('Auto Rules Service started');

    // Run every 1 minute
    setInterval(async () => {
        try {
            const chatController = require('../controllers/chatController');
            await chatController.autoAssign(); // This should now also pick up overflow chats if agents free up

            const io = getIO();
            if (!io) return;

            const now = new Date();
            const idleThreshold = 5 * 60 * 1000; // 5 minutes for "still here" message
            const closeThreshold = 15 * 60 * 1000; // 15 minutes for auto-close

            // 1. Find idle chats to send "Still here?" message
            const idleChats = await Chat.find({
                status: 'active',
                lastMessageAt: { $lt: new Date(now - idleThreshold) },
                metadata: { $not: { $exists: 'auto_warned' } }
            });

            for (const chat of idleChats) {
                const sysMsg = await Message.create({
                    chatId: chat._id,
                    senderId: 'system',
                    senderType: 'system',
                    content: 'We are still here! Do you need any more help? If there is no activity, this chat will close soon.',
                });

                io.to(`chat:${chat._id}`).emit('message:new', sysMsg);

                // Track that we warned them
                if (!chat.metadata) chat.metadata = new Map();
                chat.metadata.set('auto_warned', 'true');
                await chat.save();
            }

            // 2. Find abandoned chats to auto-close
            const abandonedChats = await Chat.find({
                status: { $in: ['active', 'pending'] },
                lastMessageAt: { $lt: new Date(now - closeThreshold) }
            });

            for (const chat of abandonedChats) {
                chat.status = 'completed';
                chat.endTime = now;
                chat.notes = (chat.notes || '') + '\n[System] Auto-closed due to inactivity.';
                await chat.save();

                const sysMsg = await Message.create({
                    chatId: chat._id,
                    senderId: 'system',
                    senderType: 'system',
                    content: 'This chat has been automatically closed due to inactivity.',
                });

                io.to(`chat:${chat._id}`).emit('message:new', sysMsg);
                io.to(`chat:${chat._id}`).emit('chat:completed', chat);

                // If it was assigned, decrement agent count
                if (chat.agentId) {
                    const Agent = require('../models/Agent');
                    await Agent.findByIdAndUpdate(chat.agentId, { $inc: { currentChats: -1 } });
                }
            }

            // 3. Auto logout idle agents
            const Agent = require('../models/Agent');
            const idleAgents = await Agent.find({
                status: { $in: ['online', 'busy', 'away', 'wrap-up'] },
                lastSeen: { $lt: new Date(now - 15 * 60 * 1000) } // 15 mins inactivity
            });

            for (const agent of idleAgents) {
                agent.status = 'offline';
                agent.lastStatusChange = now;
                await agent.save();

                io.emit('agent:status', {
                    agentId: agent._id,
                    status: 'offline',
                    reason: 'idle_timeout'
                });
            }

            // 4. SLA Breach Monitoring
            const slaThreshold = 5 * 60 * 1000; // 5 mins
            const breachChats = await Chat.find({
                status: { $in: ['pending', 'overflow'] },
                startTime: { $lt: new Date(now - slaThreshold) },
                'metadata.sla_warned': { $ne: true }
            });

            for (const chat of breachChats) {
                io.emit('sla:warning', {
                    chatId: chat._id,
                    visitorName: chat.visitorId?.name || 'Visitor',
                    waitTime: Math.floor((now - chat.startTime) / 60000),
                    status: chat.status
                });

                if (!chat.metadata) chat.metadata = new Map();
                chat.metadata.set('sla_warned', 'true');
                await chat.save();
            }

            // 5. Shift Ending Monitoring
            const soon = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins from now
            const formatTime = (date) => `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
            const currentTimeStr = formatTime(now);
            const soonTimeStr = formatTime(soon);

            const activeAgents = await Agent.find({ status: { $ne: 'offline' } });
            for (const agent of activeAgents) {
                if (agent.shiftHours && agent.shiftHours.end) {
                    if (agent.shiftHours.end > currentTimeStr && agent.shiftHours.end <= soonTimeStr) {
                        // Notify agent their shift is ending
                        io.to(`agent:${agent._id}`).emit('notification:shift_ending', {
                            message: `Your shift ends at ${agent.shiftHours.end}. Please start wrapping up your chats.`,
                            endTime: agent.shiftHours.end
                        });
                    }
                }
            }

        } catch (error) {
            console.error('Auto Rules Service Error:', error);
        }
    }, 60 * 1000);
};

module.exports = { startAutoRulesService };
