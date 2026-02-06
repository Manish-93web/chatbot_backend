const Device = require('../models/Device');
const IssueCategory = require('../models/IssueCategory');
const Department = require('../models/Department');
const SLAConfig = require('../models/SLAConfig');

// Device Catalog Management
exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find().sort({ brand: 1, model: 1 });
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDevice = async (req, res) => {
  try {
    const device = await Device.create(req.body);
    
    const { logAction } = require('../services/auditService');
    await logAction({
        userId: req.agent._id,
        userType: 'agent',
        action: 'create',
        resource: 'settings',
        resourceId: device._id,
        metadata: { name: device.name, type: 'device' }
    });

    res.status(201).json({ success: true, device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const { logAction } = require('../services/auditService');
    await logAction({
        userId: req.agent._id,
        userType: 'agent',
        action: 'update',
        resource: 'settings',
        resourceId: device._id,
        metadata: { name: device.name, type: 'device' }
    });

    res.json({ success: true, device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    await Device.findByIdAndDelete(req.params.id);

    const { logAction } = require('../services/auditService');
    await logAction({
        userId: req.agent._id,
        userType: 'agent',
        action: 'delete',
        resource: 'settings',
        resourceId: req.params.id,
        metadata: { type: 'device' }
    });

    res.json({ success: true, message: 'Device deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Issue Category Management
exports.getCategories = async (req, res) => {
  try {
    const categories = await IssueCategory.find().populate('departmentId', 'name');
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await IssueCategory.create(req.body);

    const { logAction } = require('../services/auditService');
    await logAction({
        userId: req.agent._id,
        userType: 'agent',
        action: 'create',
        resource: 'settings',
        resourceId: category._id,
        metadata: { name: category.name, type: 'category' }
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await IssueCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const { logAction } = require('../services/auditService');
    await logAction({
        userId: req.agent._id,
        userType: 'agent',
        action: 'update',
        resource: 'settings',
        resourceId: category._id,
        metadata: { name: category.name, type: 'category' }
    });

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SLA & Global Settings
exports.getSLAs = async (req, res) => {
  try {
    const slas = await SLAConfig.find();
    res.json({ success: true, slas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSLA = async (req, res) => {
  try {
    const sla = await SLAConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const { logAction } = require('../services/auditService');
    await logAction({
        userId: req.agent._id,
        userType: 'agent',
        action: 'update',
        resource: 'settings',
        resourceId: sla._id,
        metadata: { name: sla.name, type: 'sla' }
    });

    res.json({ success: true, sla });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
