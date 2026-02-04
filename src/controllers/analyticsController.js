const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const Agent = require('../models/Agent');

// @desc    Get analytics overview
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get all chats
    const allChats = await Chat.find(dateFilter);
    const allVisitors = await Visitor.find();

    // Calculate metrics
    const totalChats = allChats.length;
    const activeChats = allChats.filter(c => c.status === 'active').length;
    const completedChats = allChats.filter(c => c.status === 'completed').length;
    const missedChats = allChats.filter(c => c.status === 'missed').length;
    const pendingChats = allChats.filter(c => c.status === 'pending').length;

    // Average duration
    const completedWithDuration = allChats.filter(c => c.status === 'completed' && c.duration > 0);
    const averageDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, c) => sum + c.duration, 0) / completedWithDuration.length
      : 0;

    // Satisfaction score
    const chatsWithSatisfaction = allChats.filter(c => c.satisfaction);
    const satisfactionScore = chatsWithSatisfaction.length > 0
      ? chatsWithSatisfaction.reduce((sum, c) => sum + c.satisfaction, 0) / chatsWithSatisfaction.length
      : 0;

    // Visitor metrics
    const totalVisitors = allVisitors.length;
    const onlineVisitors = allVisitors.filter(v => v.online).length;

    // Chart Data (Daily stats)
    const chartData = {};
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7Days.push(dateStr);
        chartData[dateStr] = { date: d.toLocaleDateString('en-US', { weekday: 'short' }), chats: 0, completed: 0, missed: 0 };
    }

    allChats.forEach(chat => {
        if (chat.startTime) {
            const dateStr = chat.startTime.toISOString().split('T')[0];
            if (chartData[dateStr]) {
                chartData[dateStr].chats++;
                if (chat.status === 'completed') chartData[dateStr].completed++;
                if (chat.status === 'missed') chartData[dateStr].missed++;
            }
        }
    });

    res.json({
      success: true,
      analytics: {
        chats: {
          total: totalChats,
          active: activeChats,
          completed: completedChats,
          missed: missedChats,
          pending: pendingChats,
          averageDuration: Math.round(averageDuration),
          satisfactionScore: satisfactionScore.toFixed(2),
        },
        visitors: {
          total: totalVisitors,
          online: onlineVisitors,
        },
        performance: {
          averageWaitTime: 45,
          responseRate: totalChats > 0 ? ((completedChats / totalChats) * 100).toFixed(2) : 0,
        },
        chartData: Object.values(chartData),
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get agent analytics
// @route   GET /api/analytics/agents
// @access  Private
exports.getAgentAnalytics = async (req, res) => {
  try {
    const { agentId } = req.query;

    const agents = agentId 
      ? await Agent.find({ _id: agentId })
      : await Agent.find();

    const agentMetrics = await Promise.all(agents.map(async (agent) => {
      const agentChats = await Chat.find({ agentId: agent._id });
      const completedChats = agentChats.filter(c => c.status === 'completed');
      const activeChats = agentChats.filter(c => c.status === 'active');

      // Satisfaction score
      const chatsWithSatisfaction = completedChats.filter(c => c.satisfaction);
      const satisfactionScore = chatsWithSatisfaction.length > 0
        ? chatsWithSatisfaction.reduce((sum, c) => sum + c.satisfaction, 0) / chatsWithSatisfaction.length
        : 0;

      // Average duration
      const chatsWithDuration = completedChats.filter(c => c.duration > 0);
      const averageDuration = chatsWithDuration.length > 0
        ? chatsWithDuration.reduce((sum, c) => sum + c.duration, 0) / chatsWithDuration.length
        : 0;

      return {
        agentId: agent._id,
        agentName: agent.name,
        displayName: agent.displayName,
        avatar: agent.avatar,
        department: agent.departmentId,
        chatsHandled: agentChats.length,
        activeChats: activeChats.length,
        completedChats: completedChats.length,
        averageDuration: Math.round(averageDuration),
        satisfactionScore: satisfactionScore.toFixed(2),
        averageResponseTime: 45,
        availability: agent.enabled ? 85 : 0,
      };
    }));

    res.json({
      success: true,
      agents: agentMetrics,
    });
  } catch (error) {
    console.error('Get agent analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = exports;
