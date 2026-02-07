const Ticket = require('../models/Ticket');
const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const Agent = require('../models/Agent');
const AuditLog = require('../models/AuditLog');
const SLAConfig = require('../models/SLAConfig');

// Helper function to log audit
const logAudit = async (userId, userType, action, resource, resourceId, changes = {}) => {
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
};

// Helper function to calculate SLA deadlines
const calculateSLA = async (priority) => {
  try {
    const slaConfig = await SLAConfig.findOne({ priority, enabled: true });
    if (!slaConfig) return {};

    const now = new Date();
    const responseBy = new Date(now.getTime() + slaConfig.firstResponseTime * 60000);
    const resolveBy = new Date(now.getTime() + slaConfig.resolutionTime * 60000);

    return {
      responseBy,
      resolveBy,
      breached: false,
    };
  } catch (error) {
    console.error('SLA calculation error:', error);
    return {};
  }
};

// Create ticket
exports.createTicket = async (req, res) => {
  try {
    const {
      chatId,
      visitorId,
      assignedTo,
      departmentId,
      priority,
      category,
      subject,
      description,
      deviceInfo,
      tags,
    } = req.body;

    // Calculate SLA
    const sla = await calculateSLA(priority || 'medium');

    const ticket = await Ticket.create({
      chatId,
      visitorId,
      assignedTo,
      departmentId,
      priority: priority || 'medium',
      category,
      subject,
      description,
      deviceInfo,
      sla,
      tags,
    });

    await ticket.populate(['visitorId', 'assignedTo', 'departmentId', 'chatId']);

    // Log audit
    await logAudit(req.user?.id || 'system', req.user ? 'agent' : 'system', 'ticket_create', 'ticket', ticket._id);

    res.status(201).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message,
    });
  }
};

// Get all tickets with filters
exports.getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      departmentId,
      category,
      visitorId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (departmentId) query.departmentId = departmentId;
    if (category) query.category = category;
    if (visitorId) query.visitorId = visitorId;
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('visitorId', 'name email')
        .populate('assignedTo', 'name email')
        .populate('departmentId', 'name')
        .populate('chatId')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(query),
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message,
    });
  }
};

// Get single ticket
exports.getTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('visitorId')
      .populate('assignedTo')
      .populate('departmentId')
      .populate('chatId')
      .populate('escalationHistory.escalatedBy', 'name')
      .populate('escalationHistory.escalatedTo', 'name')
      .populate('resolution.resolvedBy', 'name');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message,
    });
  }
};

// Update ticket
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const before = ticket.toObject();

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        ticket[key] = updates[key];
      }
    });

    await ticket.save();
    await ticket.populate(['visitorId', 'assignedTo', 'departmentId', 'chatId']);

    // Log audit
    await logAudit(
      req.user?.id || 'system',
      req.user ? 'agent' : 'system',
      'update',
      'ticket',
      ticket._id,
      { before, after: ticket.toObject() }
    );

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket',
      error: error.message,
    });
  }
};

// Escalate ticket
exports.escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalatedTo, reason } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    ticket.escalationLevel += 1;
    ticket.escalationHistory.push({
      level: ticket.escalationLevel,
      escalatedBy: req.user?.id,
      escalatedTo,
      reason,
      escalatedAt: new Date(),
    });

    if (escalatedTo) {
      ticket.assignedTo = escalatedTo;
    }

    ticket.status = 'escalated';
    await ticket.save();
    await ticket.populate(['visitorId', 'assignedTo', 'departmentId']);

    // Log audit
    await logAudit(req.user?.id, 'agent', 'escalate', 'ticket', ticket._id, { level: ticket.escalationLevel, reason });

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Escalate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate ticket',
      error: error.message,
    });
  }
};

// Merge tickets
exports.mergeTickets = async (req, res) => {
  try {
    const { primaryTicketId, ticketIds } = req.body;

    const primaryTicket = await Ticket.findById(primaryTicketId);
    if (!primaryTicket) {
      return res.status(404).json({
        success: false,
        message: 'Primary ticket not found',
      });
    }

    // Update merged tickets
    await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { status: 'closed', mergedWith: [primaryTicketId] }
    );

    // Update primary ticket
    primaryTicket.mergedWith.push(...ticketIds);
    await primaryTicket.save();

    // Log audit
    await logAudit(req.user?.id, 'agent', 'update', 'ticket', primaryTicketId, { merged: ticketIds });

    res.json({
      success: true,
      message: 'Tickets merged successfully',
      primaryTicket,
    });
  } catch (error) {
    console.error('Merge tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge tickets',
      error: error.message,
    });
  }
};

// Reopen ticket
exports.reopenTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Only closed or resolved tickets can be reopened',
      });
    }

    ticket.status = 'open';
    ticket.reopenCount += 1;
    ticket.reopenHistory.push({
      reopenedBy: req.user?.id || ticket.visitorId,
      reopenedAt: new Date(),
      reason,
    });

    // Recalculate SLA
    ticket.sla = await calculateSLA(ticket.priority);

    await ticket.save();
    await ticket.populate(['visitorId', 'assignedTo', 'departmentId']);

    // Log audit
    await logAudit(req.user?.id || ticket.visitorId, req.user ? 'agent' : 'visitor', 'update', 'ticket', ticket._id, { reopened: true, reason });

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reopen ticket',
      error: error.message,
    });
  }
};

// Close ticket
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();

    if (resolution) {
      ticket.resolution.summary = resolution;
      ticket.resolution.resolvedBy = req.user?.id;
      ticket.resolution.resolvedAt = new Date();
    }

    await ticket.save();
    await ticket.populate(['visitorId', 'assignedTo', 'departmentId']);

    // Log audit
    await logAudit(req.user?.id, 'agent', 'ticket_close', 'ticket', ticket._id);

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket',
      error: error.message,
    });
  }
};

// Get ticket statistics
exports.getTicketStats = async (req, res) => {
  try {
    const { startDate, endDate, agentId, departmentId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (agentId) query.assignedTo = agentId;
    if (departmentId) query.departmentId = departmentId;

    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      escalatedTickets,
      breachedSLA,
      avgResolutionTime,
      ticketsByPriority,
      ticketsByCategory,
    ] = await Promise.all([
      Ticket.countDocuments(query),
      Ticket.countDocuments({ ...query, status: 'open' }),
      Ticket.countDocuments({ ...query, status: 'resolved' }),
      Ticket.countDocuments({ ...query, status: 'escalated' }),
      Ticket.countDocuments({ ...query, 'sla.breached': true }),
      Ticket.aggregate([
        { $match: { ...query, 'resolution.resolutionTime': { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: '$resolution.resolutionTime' } } },
      ]),
      Ticket.aggregate([
        { $match: query },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        total: totalTickets,
        open: openTickets,
        resolved: resolvedTickets,
        escalated: escalatedTickets,
        breachedSLA,
        avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
        byPriority: ticketsByPriority,
        byCategory: ticketsByCategory,
      },
    });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket statistics',
      error: error.message,
    });
  }
};

// Convert chat to ticket
exports.convertChatToTicket = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { category, subject, description, priority, deviceInfo } = req.body;

    const chat = await Chat.findById(chatId).populate('visitorId');
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if ticket already exists for this chat
    let ticket = await Ticket.findOne({ $or: [{ chatId }, { relatedChats: chatId }] });

    if (ticket) {
      return res.status(200).json({
        success: true,
        message: 'Chat is already linked to a ticket',
        ticket,
      });
    }

    // Optional: Link to an existing ticket if ticketId provided
    const { targetTicketId } = req.body;
    if (targetTicketId) {
      ticket = await Ticket.findById(targetTicketId);
      if (ticket) {
        ticket.relatedChats.push(chatId);
        await ticket.save();
        return res.json({ success: true, message: 'Chat linked to existing ticket', ticket });
      }
    }

    // Calculate SLA
    const sla = await calculateSLA(priority || 'medium');

    ticket = await Ticket.create({
      chatId,
      visitorId: chat.visitorId._id,
      assignedTo: chat.agentId,
      departmentId: chat.departmentId,
      priority: priority || 'medium',
      category,
      subject: subject || `Chat ${chatId} - ${chat.visitorId.name}`,
      description: description || 'Converted from chat',
      deviceInfo,
      sla,
    });

    await ticket.populate(['visitorId', 'assignedTo', 'departmentId', 'chatId']);

    // Log audit
    await logAudit(req.user?.id, 'agent', 'ticket_create', 'ticket', ticket._id, { convertedFrom: chatId });

    res.status(201).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Convert chat to ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert chat to ticket',
      error: error.message,
    });
  }
};
