const mongoose = require('mongoose');
const { assertClinicalIntelligenceAccess } = require('../utils/clinicalAccess');
const { buildCaseTimeline } = require('../services/clinicalEventService');
const { buildClinicalCaseState } = require('../services/clinicalCaseStateService');

exports.getCaseTimeline = async (req, res) => {
  try {
    const { caseId } = req.params;
    const access = await assertClinicalIntelligenceAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const timeline = await buildCaseTimeline(caseId);
    return res.status(200).json({ success: true, data: timeline });
  } catch (e) {
    console.error('getCaseTimeline:', e);
    return res.status(500).json({ success: false, message: 'Failed to load case timeline' });
  }
};

exports.getClinicalCaseState = async (req, res) => {
  try {
    const { caseId } = req.params;
    const access = await assertClinicalIntelligenceAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const role = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
    if (!['clinician', 'therapist', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Clinical case state is limited to clinical staff and admin' });
    }
    const out = await buildClinicalCaseState(caseId);
    if (!out.success) {
      return res.status(404).json({ success: false, message: out.message || 'Not found' });
    }
    return res.status(200).json({ success: true, data: out.data });
  } catch (e) {
    console.error('getClinicalCaseState:', e);
    return res.status(500).json({ success: false, message: 'Failed to load clinical case state' });
  }
};
