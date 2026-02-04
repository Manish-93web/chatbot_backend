const Shortcut = require('../models/Shortcut');

exports.getShortcuts = async (req, res) => {
  try {
    const shortcuts = await Shortcut.find({})
      .populate('roles departments');
    res.json({ success: true, shortcuts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createShortcut = async (req, res) => {
  try {
    const shortcut = await Shortcut.create(req.body);
    const populated = await Shortcut.findById(shortcut._id).populate('roles departments');
    res.json({ success: true, shortcut: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Keyword already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateShortcut = async (req, res) => {
  try {
    const shortcut = await Shortcut.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('roles departments');
    res.json({ success: true, shortcut });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteShortcut = async (req, res) => {
  try {
    await Shortcut.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shortcut deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
