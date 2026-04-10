/**
 * Shared session log validation for therapist routes (schema fields unchanged; childResponse stays string).
 */

const { parseResponseScore } = require('./sessionResponseScore');

const SESSION_STATUS = ['completed', 'missed', 'rescheduled'];

function validateSessionBody(body, { requireGoalsAndActivities = true, isUpdate = false } = {}) {
  const {
    sessionDate,
    duration = 0,
    goalsTargeted = [],
    activitiesUsed = [],
    childResponse = '',
    notes = '',
    parentInstructions = '',
    status = 'completed',
  } = body || {};

  if (!sessionDate) {
    return { ok: false, message: 'sessionDate is required' };
  }
  const dur = Number(duration);
  if (Number.isNaN(dur) || dur < 0 || (!isUpdate && dur <= 0)) {
    return { ok: false, message: 'duration must be a positive number (minutes)' };
  }

  const g = Array.isArray(goalsTargeted) ? goalsTargeted.map((x) => String(x).trim()).filter(Boolean) : [];
  const a = Array.isArray(activitiesUsed) ? activitiesUsed.map((x) => String(x).trim()).filter(Boolean) : [];

  if (requireGoalsAndActivities && g.length === 0) {
    return { ok: false, message: 'At least one goal is required' };
  }
  if (requireGoalsAndActivities && a.length === 0) {
    return { ok: false, message: 'At least one activity is required' };
  }

  const cr = String(childResponse || '').trim();
  if (!cr) {
    return { ok: false, message: 'childResponse is required' };
  }
  if (parseResponseScore(cr) == null) {
    return {
      ok: false,
      message:
        'childResponse must be a 1–5 scale (use format scale:1 … scale:5), a percentage (0–100, e.g. 75%), or supported descriptive text',
    };
  }

  const st = String(status || '').trim();
  if (!SESSION_STATUS.includes(st)) {
    return { ok: false, message: 'status must be completed, missed, or rescheduled' };
  }

  return {
    ok: true,
    payload: {
      sessionDate: new Date(sessionDate),
      duration: dur,
      goalsTargeted: g,
      activitiesUsed: a,
      childResponse: cr,
      notes: String(notes || '').trim(),
      parentInstructions: String(parentInstructions || '').trim(),
      status: st,
    },
  };
}

module.exports = {
  SESSION_STATUS,
  validateSessionBody,
};
