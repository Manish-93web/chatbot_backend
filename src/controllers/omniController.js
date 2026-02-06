const Chat = require('../models/Chat');
const Ticket = require('../models/Ticket');
const Visitor = require('../models/Visitor');
const Message = require('../models/Message');

/**
 * Simulate an incoming Email that creates a Ticket
 */
exports.simulateIncomingEmail = async (req, res) => {
    try {
        const { from, subject, body } = req.body;

        // Find or create visitor by email
        let visitor = await Visitor.findOne({ email: from });
        if (!visitor) {
            visitor = await Visitor.create({
                sessionId: `email-${Date.now()}`,
                name: from.split('@')[0],
                email: from,
                gdprConsent: true,
                consentTimestamp: new Date()
            });
        }

        // Create ticket
        const ticket = await Ticket.create({
            visitorId: visitor._id,
            subject: subject || 'No Subject',
            description: body || 'No content',
            category: 'General',
            channel: 'email',
            status: 'open',
            priority: 'medium'
        });

        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Simulate an incoming SMS that starts/updates a Chat
 */
exports.simulateIncomingSMS = async (req, res) => {
    try {
        const { from, text } = req.body;

        // Find or create visitor by phone
        let visitor = await Visitor.findOne({ phone: from });
        if (!visitor) {
            visitor = await Visitor.create({
                sessionId: `sms-${Date.now()}`,
                name: `SMS ${from}`,
                phone: from,
                gdprConsent: true,
                consentTimestamp: new Date()
            });
        }

        // Find active chat or create one
        let chat = await Chat.findOne({ visitorId: visitor._id, status: { $in: ['pending', 'active'] } });
        if (!chat) {
            chat = await Chat.create({
                visitorId: visitor._id,
                channel: 'sms',
                status: 'pending'
            });
        }

        // Create message
        const message = await Message.create({
            chatId: chat._id,
            senderId: visitor._id,
            senderType: 'visitor',
            content: text,
            type: 'text'
        });

        // Trigger socket event (mocking global io access)
        if (global.io) {
            global.io.to(chat._id.toString()).emit('message:new', message);
            if (chat.status === 'pending') {
                global.io.emit('chat:new', chat);
            }
        }

        res.json({ success: true, chat, message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Simulate an incoming WhatsApp message
 */
exports.simulateIncomingWhatsApp = async (req, res) => {
    try {
        const { from, text } = req.body;

        // Find or create visitor
        let visitor = await Visitor.findOne({ phone: from });
        if (!visitor) {
            visitor = await Visitor.create({
                sessionId: `wa-${Date.now()}`,
                name: `WA ${from}`,
                phone: from,
                gdprConsent: true,
                consentTimestamp: new Date()
            });
        }

        // Find active chat or create one
        let chat = await Chat.findOne({ visitorId: visitor._id, status: { $in: ['pending', 'active'] } });
        if (!chat) {
            chat = await Chat.create({
                visitorId: visitor._id,
                channel: 'whatsapp',
                status: 'pending'
            });
        }

        // Create message
        const message = await Message.create({
            chatId: chat._id,
            senderId: visitor._id,
            senderType: 'visitor',
            content: text,
            type: 'text'
        });

        if (global.io) {
            global.io.to(chat._id.toString()).emit('message:new', message);
            if (chat.status === 'pending') {
                global.io.emit('chat:new', chat);
            }
        }

        res.json({ success: true, chat, message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
