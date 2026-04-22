const mongoose = require('mongoose');
const LabTest = require('../models/LabTest');
const LabApproval = require('../models/LabApproval');

function asRegexSafe(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.createLabTest = async (req, res) => {
  try {
    const { test_name, category, description, price, duration } = req.body || {};
    if (!test_name || !category) {
      return res.status(400).json({ success: false, message: 'test_name and category are required' });
    }

    const created = await LabTest.create({
      lab_id: req.user._id,
      test_name: String(test_name).trim(),
      category: String(category).trim(),
      description: String(description || '').trim(),
      price: Number(price || 0),
      duration: String(duration || '').trim(),
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'This test already exists for your lab' });
    }
    console.error('createLabTest:', error);
    return res.status(500).json({ success: false, message: 'Failed to create lab test' });
  }
};

exports.updateLabTest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test id' });
    }

    const updates = {};
    const allowed = ['test_name', 'category', 'description', 'price', 'duration'];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.test_name != null) updates.test_name = String(updates.test_name).trim();
    if (updates.category != null) updates.category = String(updates.category).trim();
    if (updates.description != null) updates.description = String(updates.description).trim();
    if (updates.duration != null) updates.duration = String(updates.duration).trim();
    if (updates.price != null) updates.price = Number(updates.price || 0);

    const updated = await LabTest.findOneAndUpdate(
      { _id: id, lab_id: req.user._id },
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'This test already exists for your lab' });
    }
    console.error('updateLabTest:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lab test' });
  }
};

exports.deleteLabTest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test id' });
    }

    const deleted = await LabTest.findOneAndDelete({ _id: id, lab_id: req.user._id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }
    return res.status(200).json({ success: true, message: 'Lab test deleted' });
  } catch (error) {
    console.error('deleteLabTest:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete lab test' });
  }
};

exports.getMyLabTests = async (req, res) => {
  try {
    const rows = await LabTest.find({ lab_id: req.user._id })
      .sort({ createdAt: -1, test_name: 1 })
      .lean();
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getMyLabTests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your lab tests' });
  }
};

exports.getAllLabTests = async (_req, res) => {
  try {
    const tests = await LabTest.find({})
      .populate({
        path: 'lab_id',
        select: 'labName accreditation role',
        match: { role: 'lab' },
      })
      .sort({ test_name: 1, category: 1, createdAt: -1 })
      .lean();

    const labIds = tests
      .filter((row) => row.lab_id?._id)
      .map((row) => String(row.lab_id._id));
    const activeApprovals = await LabApproval.find({
      labUserId: { $in: labIds },
      status: 'active',
    })
      .select('labUserId')
      .lean();
    const activeLabIdSet = new Set(activeApprovals.map((row) => String(row.labUserId)));

    const data = tests
      .filter((row) => row.lab_id && activeLabIdSet.has(String(row.lab_id._id)))
      .map((row) => ({
        _id: row._id,
        test_name: row.test_name,
        category: row.category,
        description: row.description || '',
        price: row.price || 0,
        duration: row.duration || '',
        lab: {
          _id: row.lab_id._id,
          labName: row.lab_id.labName || 'Lab',
          accreditation: row.lab_id.accreditation || '',
        },
      }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getAllLabTests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lab tests' });
  }
};

exports.getLabsByTest = async (req, res) => {
  try {
    const testName = String(req.params.testName || '').trim();
    if (!testName) {
      return res.status(400).json({ success: false, message: 'testName is required' });
    }

    const tests = await LabTest.find({
      test_name: { $regex: `^${asRegexSafe(testName)}$`, $options: 'i' },
    })
      .populate({
        path: 'lab_id',
        select: 'labName accreditation role',
        match: { role: 'lab' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const labIds = tests
      .filter((row) => row.lab_id?._id)
      .map((row) => String(row.lab_id._id));
    const activeApprovals = await LabApproval.find({
      labUserId: { $in: labIds },
      status: 'active',
    })
      .select('labUserId')
      .lean();
    const activeLabIdSet = new Set(activeApprovals.map((row) => String(row.labUserId)));

    const data = tests
      .filter((row) => row.lab_id && activeLabIdSet.has(String(row.lab_id._id)))
      .map((row) => ({
        test_id: row._id,
        test_name: row.test_name,
        category: row.category,
        lab_id: row.lab_id._id,
        labName: row.lab_id.labName || 'Lab',
        accreditation: row.lab_id.accreditation || '',
      }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getLabsByTest:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch labs by test' });
  }
};
