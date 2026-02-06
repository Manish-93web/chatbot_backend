const Shortcut = require('../models/Shortcut');

exports.getShortcuts = async (req, res) => {
  try {
    // Return:
    // 1. Personal shortcuts (agentId = user.id)
    // 2. Shared shortcuts (isShared = true)
    
    // Using simple query for now
    const shortcuts = await Shortcut.find({
        $or: [
            { agentId: req.user.id },
            { isShared: true }
        ]
    })
    .sort({ keyword: 1 });
    
    res.json({ success: true, shortcuts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createShortcut = async (req, res) => {
  try {
    const { keyword, message, isShared = false } = req.body;
    
    const shortcutData = {
        keyword,
        message,
        isShared
    };

    if (isShared && req.user.role === 'Admin') {
        // Shared shortcuts don't belong to specific agent's private list usually, 
        // but let's just mark them shared.
        // We could assign departmentId here too.
    } else {
        // Personal shortcut
        shortcutData.agentId = req.user.id;
        shortcutData.isShared = false;
    }

    const shortcut = await Shortcut.create(shortcutData);
    res.json({ success: true, shortcut });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Shortcut already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateShortcut = async (req, res) => {
  try {
    const shortcut = await Shortcut.findById(req.params.id);
    if (!shortcut) return res.status(404).json({ success: false, error: 'Not found' });

    // Auth check
    if (shortcut.agentId && shortcut.agentId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const updated = await Shortcut.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, shortcut: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteShortcut = async (req, res) => {
  try {
    const shortcut = await Shortcut.findById(req.params.id);
    if (!shortcut) return res.status(404).json({ success: false, error: 'Not found' });

    // Auth check
     if (shortcut.agentId && shortcut.agentId.toString() !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Shortcut.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shortcut deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
