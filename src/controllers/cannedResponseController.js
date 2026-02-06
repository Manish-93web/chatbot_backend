const CannedResponse = require('../models/CannedResponse');

// Get all canned responses for an agent (personal + shared department)
exports.getCannedResponses = async (req, res) => {
  try {
    const { departmentId } = req.user; // Assuming auth middleware populates this
    
    // Find personal responses OR shared department responses
    const responses = await CannedResponse.find({
      $or: [
        { agentId: req.user.id },
        { departmentId: departmentId ? departmentId : null }
      ]
    }).sort({ shortcut: 1 });

    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Create a new canned response
exports.createCannedResponse = async (req, res) => {
  try {
    const { shortcut, content, tags, isShared } = req.body;
    
    // If shared, require departmentId. If personal, use agentId.
    const responseData = {
      shortcut,
      content,
      tags
    };

    if (isShared && req.user.role === 'Admin') { // Only admins can make shared? Or Maybe Team Leads. keeping simple for now
         responseData.departmentId = req.user.departmentId;
    } else {
         responseData.agentId = req.user.id;
    }

    const response = await CannedResponse.create(responseData);
    res.status(201).json({ success: true, response });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(400).json({ success: false, error: 'Shortcut already exists' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete a canned response
exports.deleteCannedResponse = async (req, res) => {
  try {
    const response = await CannedResponse.findOne({ _id: req.params.id });

    if (!response) {
      return res.status(404).json({ success: false, error: 'Response not found' });
    }

    // Verify ownership
    if (response.agentId && response.agentId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    // Assuming Admins can delete department ones
    if (response.departmentId && req.user.role !== 'Admin') {
         return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await response.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
