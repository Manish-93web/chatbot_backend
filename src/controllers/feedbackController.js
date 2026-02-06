const Chat = require('../models/Chat');
const Message = require('../models/Message');
const emailService = require('../services/emailService');

exports.submitFeedback = async (req, res) => {
  try {
    const checkId = req.params.id;
    const { rating, feedbackComment, resolutionStatus } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      checkId,
      {
        satisfaction: rating, // Mapping rating to existing 'satisfaction' field
        feedbackComment,
        resolutionStatus,
      },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, msg: 'Chat not found' });
    }

    res.json({ success: true, chat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
};

exports.sendTranscript = async (req, res) => {
  try {
    const { email } = req.body;
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({ success: false, msg: 'Chat not found' });
    }

    // Get messages
    const messages = await Message.find({ chatId: chat._id }).sort({ sentAt: 1 });

    // Send email
    const sent = await emailService.sendChatTranscript(email, chat, messages);

    if (sent) {
        await Chat.findByIdAndUpdate(req.params.id, { transcriptSent: true });
        res.json({ success: true, msg: 'Transcript sent successfully' });
    } else {
        res.status(500).json({ success: false, msg: 'Failed to send transcript' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
};
