const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  devices: [{
    type: String,
    index: true,
  }],
  versions: [{
    type: String,
    index: true,
  }],
  isInternal: {
    type: Boolean,
    default: false,
    index: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
  notHelpfulCount: {
    type: Number,
    default: 0,
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true,
  }
}, {
  timestamps: true,
});

// Create index for search
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Article', articleSchema);
