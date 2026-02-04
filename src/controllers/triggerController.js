const Trigger = require('../models/Trigger');

exports.getTriggers = async (req, res) => {
  try {
    const triggers = await Trigger.find({});
    res.json({ success: true, triggers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createTrigger = async (req, res) => {
  try {
    const trigger = await Trigger.create(req.body);
    res.json({ success: true, trigger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateTrigger = async (req, res) => {
  try {
    const trigger = await Trigger.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, trigger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteTrigger = async (req, res) => {
  try {
    await Trigger.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Trigger deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
