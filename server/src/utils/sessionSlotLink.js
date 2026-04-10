const mongoose = require('mongoose');
const { SessionSlot } = require('../models/SessionSlot');
const SessionLog = require('../models/SessionLog');

function combineDateAndTime(slotDate, timeStr) {
  const d = new Date(slotDate);
  const parts = String(timeStr || '00:00').split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Validates optional sessionSlotId before creating a SessionLog (duplicate + slot state).
 */
async function validateSessionSlotForNewLog({ caseId, sessionSlotId }) {
  if (sessionSlotId == null || sessionSlotId === '') {
    return { ok: true };
  }
  const sid = String(sessionSlotId);
  if (!mongoose.Types.ObjectId.isValid(sid)) {
    return { ok: false, status: 400, message: 'Invalid sessionSlotId' };
  }
  const dup = await SessionLog.findOne({ sessionSlotId: sid }).select('_id').lean();
  if (dup) {
    return {
      ok: false,
      status: 409,
      message: 'A session log is already linked to this scheduled slot.',
    };
  }
  const slot = await SessionSlot.findOne({ _id: sid, caseId }).lean();
  if (!slot) {
    return { ok: false, status: 400, message: 'Session slot not found for this case.' };
  }
  if (slot.status !== 'scheduled') {
    return {
      ok: false,
      status: 409,
      message: 'This scheduled slot cannot be used (already completed or updated).',
    };
  }
  return { ok: true };
}

/**
 * After a session log is saved: mark the best matching scheduled slot as completed.
 * Uses optional body.sessionSlotId when set; otherwise nearest same-day scheduled slot.
 */
async function completeMatchingSessionSlot({ caseId, sessionDate, sessionSlotId }) {
  const cid = caseId;
  const sDate = new Date(sessionDate);
  if (Number.isNaN(sDate.getTime())) return;

  if (sessionSlotId && mongoose.Types.ObjectId.isValid(String(sessionSlotId))) {
    const slot = await SessionSlot.findOne({
      _id: sessionSlotId,
      caseId: cid,
      status: 'scheduled',
    }).lean();
    if (slot) {
      await SessionSlot.updateOne({ _id: slot._id }, { $set: { status: 'completed' } });
      return;
    }
  }

  const dayStart = new Date(sDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(sDate);
  dayEnd.setHours(23, 59, 59, 999);

  const slots = await SessionSlot.find({
    caseId: cid,
    status: 'scheduled',
    date: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  if (slots.length === 0) return;

  const sessionMs = sDate.getTime();
  let best = slots[0];
  let bestDiff = Infinity;
  for (const s of slots) {
    const combined = combineDateAndTime(s.date, s.time);
    const diff = Math.abs(combined.getTime() - sessionMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }

  await SessionSlot.updateOne({ _id: best._id }, { $set: { status: 'completed' } });
}

module.exports = { completeMatchingSessionSlot, combineDateAndTime, validateSessionSlotForNewLog };
