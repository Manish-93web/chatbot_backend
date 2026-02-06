const Article = require('../models/Article');
const slugify = require('slugify');

exports.getArticles = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      device, 
      version, 
      isInternal, 
      status = 'published',
      limit = 20,
      page = 1
    } = req.query;

    const query = {};
    
    // Status filter
    if (status) query.status = status;

    // Internal vs Public filter
    if (isInternal !== undefined) {
      query.isInternal = isInternal === 'true';
    } else if (!req.user) {
      // If not logged in, only show public articles
      query.isInternal = false;
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Device filter
    if (device) {
      query.devices = device;
    }

    // Version filter
    if (version) {
      query.versions = version;
    }

    const skip = (page - 1) * limit;

    const articles = await Article.find(query)
      .populate('authorId', 'name displayName avatar')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Article.countDocuments(query);

    res.json({
      success: true,
      articles,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: error.message
    });
  }
};

exports.getArticle = async (req, res) => {
  try {
    const { id } = req.params;
    let article;

    if (id.length === 24) { // Likely ObjectId
      article = await Article.findById(id).populate('authorId', 'name displayName avatar');
    } else {
      article = await Article.findOne({ slug: id }).populate('authorId', 'name displayName avatar');
    }

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check permissions for internal articles
    if (article.isInternal && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment view count
    article.viewCount += 1;
    await article.save();

    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article',
      error: error.message
    });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const { title, content, category, devices, versions, isInternal, tags, status } = req.body;

    const slug = slugify(title, { lower: true, strict: true });

    // Check for existing slug
    const existing = await Article.findOne({ slug });
    const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const article = await Article.create({
      title,
      slug: finalSlug,
      content,
      category,
      devices,
      versions,
      isInternal,
      authorId: req.user.id,
      tags,
      status
    });

    res.status(201).json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create article',
      error: error.message
    });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    }

    const article = await Article.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update article',
      error: error.message
    });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findByIdAndDelete(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article',
      error: error.message
    });
  }
};

exports.rateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    if (helpful) {
      article.helpfulCount += 1;
    } else {
      article.notHelpfulCount += 1;
    }

    await article.save();

    res.json({
      success: true,
      message: 'Rating recorded'
    });
  } catch (error) {
    console.error('Rate article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate article',
      error: error.message
    });
  }
};
