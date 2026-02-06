const Rating = require('../models/Rating');
const Ticket = require('../models/Ticket');
const Chat = require('../models/Chat');
const Agent = require('../models/Agent');
const AuditLog = require('../models/AuditLog');

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

// Submit rating
exports.submitRating = async (req, res) => {
  try {
    const {
      chatId,
      ticketId,
      visitorId,
      agentId,
      rating,
      feedback,
      issueResolved,
      categories,
      wouldRecommend,
      improvementSuggestions,
      nps,
    } = req.body;

    // Validate that either chatId or ticketId is provided
    if (!chatId && !ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Either chatId or ticketId is required',
      });
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      $or: [
        { chatId: chatId },
        { ticketId: ticketId },
      ],
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Rating already submitted for this chat/ticket',
      });
    }

    const newRating = await Rating.create({
      chatId,
      ticketId,
      visitorId,
      agentId,
      rating,
      feedback,
      issueResolved,
      categories,
      wouldRecommend,
      improvementSuggestions,
      nps,
    });

    // Update chat satisfaction if chatId provided
    if (chatId) {
      await Chat.findByIdAndUpdate(chatId, { satisfaction: rating });
    }

    // Update ticket if ticketId provided
    if (ticketId) {
      await Ticket.findByIdAndUpdate(ticketId, {
        $set: { 'customFields.csat': rating.toString() },
      });
    }

    // Update agent rating statistics
    if (agentId) {
      const agent = await Agent.findById(agentId);
      if (agent) {
        const totalRatings = (agent.totalRatings || 0) + 1;
        const currentRating = agent.rating || 0;
        const newAgentRating = ((currentRating * (totalRatings - 1)) + rating) / totalRatings;
        
        await Agent.findByIdAndUpdate(agentId, {
          rating: newAgentRating,
          totalRatings,
        });
      }
    }

    await newRating.populate(['chatId', 'ticketId', 'visitorId', 'agentId']);

    // Log audit
    await logAudit(visitorId, 'visitor', 'rating_submit', 'rating', newRating._id);

    res.status(201).json({
      success: true,
      rating: newRating,
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating',
      error: error.message,
    });
  }
};

// Get ratings with filters
exports.getRatings = async (req, res) => {
  try {
    const {
      agentId,
      visitorId,
      ticketId,
      chatId,
      minRating,
      maxRating,
      sentiment,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (agentId) query.agentId = agentId;
    if (visitorId) query.visitorId = visitorId;
    if (ticketId) query.ticketId = ticketId;
    if (chatId) query.chatId = chatId;
    if (sentiment) query.sentiment = sentiment;
    
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) query.rating.$gte = parseInt(minRating);
      if (maxRating) query.rating.$lte = parseInt(maxRating);
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      Rating.find(query)
        .populate('chatId')
        .populate('ticketId')
        .populate('visitorId', 'name email')
        .populate('agentId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Rating.countDocuments(query),
    ]);

    res.json({
      success: true,
      ratings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings',
      error: error.message,
    });
  }
};

// Get agent ratings and statistics
exports.getAgentRatings = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { agentId };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [ratings, stats] = await Promise.all([
      Rating.find(query)
        .populate('chatId')
        .populate('ticketId')
        .populate('visitorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50),
      Rating.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            positiveCount: {
              $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] },
            },
            neutralCount: {
              $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] },
            },
            negativeCount: {
              $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] },
            },
            resolvedCount: {
              $sum: { $cond: ['$issueResolved', 1, 0] },
            },
            avgNPS: { $avg: '$nps' },
          },
        },
      ]),
    ]);

    const statistics = stats[0] || {
      avgRating: 0,
      totalRatings: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      resolvedCount: 0,
      avgNPS: 0,
    };

    res.json({
      success: true,
      ratings,
      statistics,
    });
  } catch (error) {
    console.error('Get agent ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent ratings',
      error: error.message,
    });
  }
};

// Get rating statistics
exports.getRatingStats = async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [overallStats, ratingDistribution, sentimentDistribution, topAgents, bottomAgents] = await Promise.all([
      Rating.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            avgNPS: { $avg: '$nps' },
            resolvedCount: {
              $sum: { $cond: ['$issueResolved', 1, 0] },
            },
          },
        },
      ]),
      Rating.aggregate([
        { $match: query },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Rating.aggregate([
        { $match: query },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$agentId',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgRating: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'agents',
            localField: '_id',
            foreignField: '_id',
            as: 'agent',
          },
        },
        { $unwind: '$agent' },
      ]),
      Rating.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$agentId',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gte: 5 } } }, // At least 5 ratings
        { $sort: { avgRating: 1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'agents',
            localField: '_id',
            foreignField: '_id',
            as: 'agent',
          },
        },
        { $unwind: '$agent' },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        overall: overallStats[0] || {},
        distribution: ratingDistribution,
        sentiment: sentimentDistribution,
        topPerformers: topAgents,
        needsImprovement: bottomAgents,
      },
    });
  } catch (error) {
    console.error('Get rating stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating statistics',
      error: error.message,
    });
  }
};

// Delete rating (admin only)
exports.deleteRating = async (req, res) => {
  try {
    const { id } = req.params;

    const rating = await Rating.findByIdAndDelete(id);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
      });
    }

    // Log audit
    await logAudit(req.user?.id, 'agent', 'delete', 'rating', id);

    res.json({
      success: true,
      message: 'Rating deleted successfully',
    });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rating',
      error: error.message,
    });
  }
};
