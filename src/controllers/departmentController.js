const Department = require('../models/Department');

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({});
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
