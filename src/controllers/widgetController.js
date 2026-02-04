const WidgetConfig = require('../models/WidgetConfig');

// @desc    Get widget config
// @route   GET /api/widget/config
// @access  Public
exports.getConfig = async (req, res) => {
  try {
    let config = await WidgetConfig.findOne();

    // Create default config if none exists
    if (!config) {
      config = await WidgetConfig.create({});
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Get widget config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update widget config
// @route   PUT /api/widget/config
// @access  Private
exports.updateConfig = async (req, res) => {
  try {
    let config = await WidgetConfig.findOne();

    if (!config) {
      config = await WidgetConfig.create(req.body);
    } else {
      config = await WidgetConfig.findByIdAndUpdate(
        config._id,
        req.body,
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Update widget config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = exports;
