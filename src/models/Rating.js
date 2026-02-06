const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  },
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true,
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
    maxlength: 1000,
  },
  issueResolved: {
    type: Boolean,
    required: true,
  },
  categories: [{
    type: String,
    enum: ['response_time', 'knowledge', 'professionalism', 'resolution', 'overall'],
  }],
  wouldRecommend: {
    type: Boolean,
  },
  improvementSuggestions: String,
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
  },
  nps: {
    type: Number,
    min: 0,
    max: 10,
  },
}, {
  timestamps: true,
});

// Auto-calculate sentiment based on rating
ratingSchema.pre('save', function(next) {
  if (this.isModified('rating')) {
    if (this.rating >= 4) {
      this.sentiment = 'positive';
    } else if (this.rating === 3) {
      this.sentiment = 'neutral';
    } else {
      this.sentiment = 'negative';
    }
  }
  next();
});

// Index for faster queries
ratingSchema.index({ agentId: 1, createdAt: -1 });
ratingSchema.index({ ticketId: 1 });
ratingSchema.index({ rating: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
