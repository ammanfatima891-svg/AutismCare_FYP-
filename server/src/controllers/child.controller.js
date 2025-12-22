const { User } = require('../models/User');
const { ROLES } = require('../models/User');

// Get a specific child for the authenticated parent
const getChildById = async (req, res) => {
  try {
    const userId = req.user.id;
    const childId = req.params.id;

    // Find the parent user
    const user = await User.findById(userId);

    if (!user || user.role !== ROLES.PARENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only parents can view children.'
      });
    }

    // Find the child in the parent's children array
    const child = user.children.id(childId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...child.toObject(),
        id: child._id
      }
    });
  } catch (error) {
    console.error('Error fetching child:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child'
    });
  }
};

// Get all children for the authenticated parent
const getChildren = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the parent user and populate children
    const user = await User.findById(userId);

    if (!user || user.role !== ROLES.PARENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only parents can view children.'
      });
    }

    // Map children to include id field for frontend compatibility
    const childrenWithId = (user.children || []).map(child => ({
      ...child.toObject(),
      id: child._id
    }));

    res.status(200).json({
      success: true,
      data: childrenWithId
    });
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch children'
    });
  }
};

// Create a new child for the authenticated parent
const createChild = async (req, res) => {
  try {
    const userId = req.user.id;
    const childData = req.body;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'emergencyContact', 'emergencyPhone'];
    const missingFields = requiredFields.filter(field => !childData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate gender
    if (!['male', 'female', 'other'].includes(childData.gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender. Must be male, female, or other.'
      });
    }

    // Find the parent user
    const user = await User.findById(userId);

    if (!user || user.role !== ROLES.PARENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only parents can create children.'
      });
    }

    // Add the child to the parent's children array
    if (!user.children) {
      user.children = [];
    }

    user.children.push(childData);
    await user.save();

    // Return the newly created child
    const newChild = user.children[user.children.length - 1];

    res.status(201).json({
      success: true,
      message: 'Child created successfully',
      data: {
        ...newChild.toObject(),
        id: newChild._id
      }
    });
  } catch (error) {
    console.error('Error creating child:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create child'
    });
  }
};

// Update a child for the authenticated parent
const updateChild = async (req, res) => {
  try {
    const userId = req.user.id;
    const childId = req.params.id;
    const updateData = req.body;

    // Find the parent user
    const user = await User.findById(userId);

    if (!user || user.role !== ROLES.PARENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only parents can update children.'
      });
    }

    // Find the child in the parent's children array
    const childIndex = user.children.findIndex(child => child._id.toString() === childId);

    if (childIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Update the child
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        user.children[childIndex][key] = updateData[key];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Child updated successfully',
      data: user.children[childIndex]
    });
  } catch (error) {
    console.error('Error updating child:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update child'
    });
  }
};

// Delete a child for the authenticated parent
const deleteChild = async (req, res) => {
  try {
    const userId = req.user.id;
    const childId = req.params.id;

    // Find the parent user
    const user = await User.findById(userId);

    if (!user || user.role !== ROLES.PARENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only parents can delete children.'
      });
    }

    // Find the child in the parent's children array
    const childIndex = user.children.findIndex(child => child._id.toString() === childId);

    if (childIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Remove the child from the array
    user.children.splice(childIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Child deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting child:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete child'
    });
  }
};

module.exports = {
  getChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild
};
