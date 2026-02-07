const Visitor = require('../models/Visitor');

// @desc    Get all visitors
// @route   GET /api/visitors
// @access  Private
exports.getVisitors = async (req, res) => {
  try {
    const { online } = req.query;

    const filter = {};
    if (online !== undefined) filter.online = online === 'true';

    const visitors = await Visitor.find(filter).sort({ lastVisit: -1 }).lean();

    // For each visitor, find if they have an active chat
    const Chat = require('../models/Chat');
    const visitorsWithChat = await Promise.all(visitors.map(async (v) => {
      const activeChat = await Chat.findOne({ visitorId: v._id, status: { $in: ['active', 'pending'] } });
      return {
        ...v,
        activeChatId: activeChat ? activeChat._id : null,
        onHold: activeChat ? activeChat.onHold : false
      };
    }));

    res.json({
      success: true,
      visitors: visitorsWithChat,
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Track visitor
// @route   POST /api/visitors
// @access  Public
exports.trackVisitor = async (req, res) => {
  try {
    const { sessionId, name, email, ipAddress, userAgent, referrer, currentPage, userId, fingerprint } = req.body;

    // Extract some info from user agent if possible (simple fallback)
    let browser = 'Chrome';
    let os = 'Windows';
    let device = 'Desktop';

    if (userAgent) {
      if (userAgent.includes('Firefox')) browser = 'Firefox';
      if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      if (userAgent.includes('Edge')) browser = 'Edge';
      if (userAgent.includes('Macintosh')) os = 'MacOS';
      if (userAgent.includes('Linux')) os = 'Linux';
      if (userAgent.includes('Android')) { os = 'Android'; device = 'Mobile'; }
      if (userAgent.includes('iPhone')) { os = 'iOS'; device = 'Mobile'; }
    }

    // Use findOneAndUpdate with upsert to avoid race conditions (E11000 errors)
    const visitor = await Visitor.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          online: true,
          lastVisit: new Date(),
          ipAddress: ipAddress || req.ip || '127.0.0.1',
          browser,
          os,
          device,
          country: 'United States', // Mocked as we don't have ip-api key
          city: 'New York', // Mocked
          ...(currentPage && { currentPage }),
          ...(name && { name }),
          ...(email && { email }),
          ...(req.body.phone && { phone: req.body.phone }),
          ...(userAgent && { userAgent }),
          ...(referrer && { referrer }),
          ...(userId && { userId }),
          ...(fingerprint && { fingerprint }),
        },
        $setOnInsert: {
          landingPage: currentPage || '/',
        },
        $inc: { numVisits: 1 }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      visitor,
    });
  } catch (error) {
    console.error('Track visitor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get visitor by ID
// @route   GET /api/visitors/:id
// @access  Private
exports.getVisitorById = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Get visitor's chat history
    const Chat = require('../models/Chat');
    const chats = await Chat.find({ visitorId: visitor._id })
      .populate('agentId', 'name displayName')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      visitor,
      chats,
    });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update visitor
// @route   PUT /api/visitors/:id
// @access  Public/Private
exports.updateVisitor = async (req, res) => {
  try {
    const { online, currentPage, name, email, customData, isBanned } = req.body;

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    if (online !== undefined) visitor.online = online;
    if (currentPage !== undefined) visitor.currentPage = currentPage;
    if (name !== undefined) visitor.name = name;
    if (email !== undefined) visitor.email = email;
    if (req.body.phone !== undefined) visitor.phone = req.body.phone;
    if (req.body.reason !== undefined) visitor.reason = req.body.reason;
    if (customData !== undefined) visitor.customData = customData;
    if (isBanned !== undefined) visitor.isBanned = isBanned;

    await visitor.save();

    // Broadcast update to all connected clients (Dashboard)
    const io = require('../websocket/socketServer').getIO();
    if (io) {
      io.emit('visitor:update', visitor);
    }

    res.json({
      success: true,
      visitor,
    });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Validate device warranty
// @route   POST /api/visitors/:id/warranty
// @access  Public
exports.validateWarranty = async (req, res) => {
  try {
    const { serialNumber } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // SIMULATION LOGIC
    // In a real system, would call an external warranty API
    let subscriptionName = 'Free';
    let status = 'none';
    let expiryDate = null;

    if (serialNumber.startsWith('WARRANTY-PLATINUM')) {
      subscriptionName = 'Platinum';
      status = 'valid';
      expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else if (serialNumber.startsWith('WARRANTY-GOLD')) {
      subscriptionName = 'Gold';
      status = 'valid';
      expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    } else if (serialNumber.startsWith('WARRANTY-SILVER')) {
      subscriptionName = 'Silver';
      status = 'valid';
      expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    } else if (serialNumber === 'EXPIRED') {
      status = 'expired';
      expiryDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    }

    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ name: subscriptionName });

    visitor.warranty = {
      serialNumber,
      expiryDate,
      status
    };
    if (subscription) {
      visitor.subscriptionId = subscription._id;
    }

    await visitor.save();

    res.json({
      success: true,
      message: status === 'valid' ? `Warranty validated! Upgraded to ${subscriptionName} support.` : 'Warranty validation failed or expired.',
      visitor: await Visitor.findById(visitor._id).populate('subscriptionId')
    });

  } catch (error) {
    console.error('Warranty validation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Upgrade subscription manually (Mock payment)
// @route   POST /api/visitors/:id/upgrade
// @access  Public
exports.upgradeSubscription = async (req, res) => {
  try {
    const { tierName } = req.body;
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ name: tierName });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription tier not found' });
    }

    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { subscriptionId: subscription._id },
      { new: true }
    ).populate('subscriptionId');

    res.json({
      success: true,
      message: `Successfully upgraded to ${tierName} plan!`,
      visitor
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Send verification code (OTP)
// @route   POST /api/visitors/:id/verify-send
// @access  Public
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    visitor.verificationCode = code;
    visitor.verificationExpires = expires;
    if (email) visitor.email = email;
    if (phone) visitor.phone = phone;
    await visitor.save();

    // MOCK SENDING (Log to console)
    console.log(`[VERIFICATION] Sent code ${code} to ${email || phone}`);

    res.json({
      success: true,
      message: `Verification code sent to ${email || phone}. (MOCK: ${code})`
    });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Verify code (OTP)
// @route   POST /api/visitors/:id/verify-confirm
// @access  Public
exports.verifyCode = async (req, res) => {
  try {
    const { code } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

    if (!visitor.verificationCode || visitor.verificationCode !== code) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    if (new Date() > visitor.verificationExpires) {
      return res.status(400).json({ success: false, error: 'Verification code expired' });
    }

    visitor.verified = true;
    visitor.verificationCode = undefined;
    visitor.verificationExpires = undefined;
    await visitor.save();

    res.json({
      success: true,
      message: 'Visitor verified successfully',
      visitor
    });
  } catch (error) {
    console.error('Confirm verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Export all visitor data (GDPR)
// @route   GET /api/visitors/:id/export
// @access  Private
exports.exportVisitorData = async (req, res) => {
  try {
    const Visitor = require('../models/Visitor'); // Ensure Visitor model is available
    const Chat = require('../models/Chat');
    const Message = require('../models/Message');
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

    const chats = await Chat.find({ visitorId: visitor._id });
    const chatIds = chats.map(c => c._id);
    const messages = await Message.find({ chatId: { $in: chatIds } });

    const Ticket = require('../models/Ticket');
    const tickets = await Ticket.find({ visitorId: visitor._id });

    const exportData = {
      visitor,
      chats,
      messages,
      tickets
    };

    res.json({
      success: true,
      data: exportData
    });

    await logAudit(req.user?.id, 'agent', 'data_export', 'visitor', visitor._id, { type: 'gdpr_export' });

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete visitor data (GDPR)
// @route   DELETE /api/visitors/:id/purge
// @access  Private (Admin)
exports.deleteVisitorData = async (req, res) => {
  try {
    const Visitor = require('../models/Visitor'); // Ensure Visitor model is available
    const Chat = require('../models/Chat');
    const Message = require('../models/Message');
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

    // Note: For real production, you might want to anonymize instead of delete 
    // to maintain business metrics. Here we delete as requested.

    const chats = await Chat.find({ visitorId: visitor._id });
    const chatIds = chats.map(c => c._id);

    await Message.deleteMany({ chatId: { $in: chatIds } });
    await Chat.deleteMany({ visitorId: visitor._id });

    const Ticket = require('../models/Ticket');
    await Ticket.deleteMany({ visitorId: visitor._id });

    await Visitor.findByIdAndDelete(visitor._id);

    res.json({
      success: true,
      message: 'All visitor data has been purged successfully.'
    });

    await logAudit(req.user?.id, 'agent', 'data_purge', 'visitor', visitor._id, { type: 'gdpr_delete' });

  } catch (error) {
    console.error('Purge data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

async function logAudit(userId, userType, action, resource, resourceId, changes = {}) {
  const AuditLog = require('../models/AuditLog');
  try {
    await AuditLog.create({
      userId,
      userType,
      action,
      resource,
      resourceId,
      changes,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

module.exports = exports;
