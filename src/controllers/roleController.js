const Role = require('../models/Role');

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
