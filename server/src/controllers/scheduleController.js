const mongoose = require('mongoose');
const { TherapySchedule } = require('../models/TherapySchedule');
const { SessionSlot, SLOT_STATUS } = require('../models/SessionSlot');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { assertUserCaseAccess } = require('../utils/caseAccess');
const { buildSlotPayloads } = require('../utils/generateSessionSlots');

function hasScheduleRangeOverlap(caseId, startDate, endDate) {
  return TherapySchedule.findOne({
    caseId,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  })
    .select('_id')
    .lean();
}

/**
 * POST /api/schedules
 * Body: { caseId, days, time, duration, startDate, endDate }
 */
exports.createSchedule = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId, days, time, duration, startDate, endDate } = req.body || {};

    if (!caseId || !mongoose.Types.ObjectId.isValid(String(caseId))) {
      return res.status(400).json({ success: false, message: 'Valid caseId is required' });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ success: false, message: 'days must be a non-empty array (e.g. Mon, Wed, Fri)' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid startDate or endDate' });
    }
    if (end < start) {
      return res.status(400).json({ success: false, message: 'endDate must be on or after startDate' });
    }

    const dur = Number(duration);
    if (Number.isNaN(dur) || dur < 1) {
      return res.status(400).json({ success: false, message: 'duration must be a positive number (minutes)' });
    }

    const overlap = await hasScheduleRangeOverlap(caseId, start, end);
    if (overlap) {
      return res.status(409).json({
        success: false,
        message: 'Another therapy schedule already exists for this case in the selected date range. Remove or adjust it before creating a new one.',
      });
    }

    const schedule = await TherapySchedule.create({
      caseId,
      therapistId,
      days,
      time: String(time || '').trim(),
      duration: dur,
      startDate: start,
      endDate: end,
    });

    let payloads;
    try {
      payloads = buildSlotPayloads({
        caseId,
        scheduleId: schedule._id,
        days,
        time: String(time || '').trim(),
        duration: dur,
        startDate: start,
        endDate: end,
      });
    } catch (e) {
      await TherapySchedule.deleteOne({ _id: schedule._id });
      if (e.code === 'INVALID_TIME') {
        return res.status(400).json({ success: false, message: e.message });
      }
      throw e;
    }

    if (payloads.length === 0) {
      await TherapySchedule.deleteOne({ _id: schedule._id });
      return res.status(400).json({
        success: false,
        message: 'No session slots generated — check days and date range.',
      });
    }

    try {
      await SessionSlot.insertMany(payloads, { ordered: true });
    } catch (e) {
      await TherapySchedule.deleteOne({ _id: schedule._id });
      if (e.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Could not create slots — a session already exists for this case on one of the generated dates/times.',
        });
      }
      throw e;
    }

    const populated = await TherapySchedule.findById(schedule._id).lean();
    return res.status(201).json({
      success: true,
      message: `Schedule created with ${payloads.length} session slots`,
      data: populated,
      slotsCreated: payloads.length,
    });
  } catch (error) {
    console.error('createSchedule:', error);
    return res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
};

/**
 * GET /api/therapist/case/:caseId/schedule-bundle
 * One round-trip for the Schedule tab (schedules + slots); same access as case file.
 */
exports.getTherapistScheduleBundle = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const [schedules, slots] = await Promise.all([
      TherapySchedule.find({ caseId }).sort({ createdAt: -1 }).lean(),
      SessionSlot.find({ caseId }).sort({ date: 1, time: 1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: { schedules, slots },
    });
  } catch (error) {
    console.error('getTherapistScheduleBundle:', error);
    return res.status(500).json({ success: false, message: 'Failed to load therapy schedule' });
  }
};

/**
 * GET /api/schedules/:caseId
 */
exports.getSchedulesByCase = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const list = await TherapySchedule.find({ caseId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('getSchedulesByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
  }
};

/**
 * GET /api/sessionslots/:caseId
 * Parent, clinician, or therapist with case access.
 */
exports.getSessionSlotsByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertUserCaseAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const slots = await SessionSlot.find({ caseId }).sort({ date: 1, time: 1 }).lean();
    return res.status(200).json({ success: true, data: slots });
  } catch (error) {
    console.error('getSessionSlotsByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch session slots' });
  }
};

/**
 * PATCH /api/sessionslots/:id
 * Therapist only — body: { status }
 */
exports.updateSessionSlot = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid slot id' });
    }

    const st = String(status || '').trim();
    if (!SLOT_STATUS.includes(st) || st === 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `status must be one of: completed, missed, rescheduled`,
      });
    }

    const slot = await SessionSlot.findById(id).lean();
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Session slot not found' });
    }

    const access = await assertTherapistCaseAccess(req, slot.caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const updated = await SessionSlot.findByIdAndUpdate(id, { $set: { status: st } }, { new: true }).lean();

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateSessionSlot:', error);
    return res.status(500).json({ success: false, message: 'Failed to update session slot' });
  }
};
