/**
 * Shared session log validation for therapist routes (schema fields unchanged; childResponse stays string).
 */

const { parseResponseScore } = require('./sessionResponseScore');
const {
  validateGoalDataArray,
  deriveChildResponseFromGoalData,
} = require('./sessionGoalDataValidation');

const SessionLog = require('../models/SessionLog');

const SESSION_STATUS = ['completed', 'missed', 'rescheduled'];
const NOTE_STATES = SessionLog.NOTE_STATES || ['draft', 'signed', 'locked'];

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
    goalData: rawGoalData,
    noteState: rawNoteState,
    lateEntry,
    lateEntryReason,
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

  const gd = validateGoalDataArray(rawGoalData);
  if (!gd.ok) return gd;

  let cr = String(childResponse || '').trim();
  if (!cr && gd.rows && gd.rows.length > 0) {
    const derived = deriveChildResponseFromGoalData(g, gd.rows);
    if (derived) cr = derived;
  }
  if (!cr) {
    return { ok: false, message: 'childResponse is required (or provide goalData with measurable rows per goal)' };
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

  const ns = rawNoteState != null ? String(rawNoteState).trim() : 'draft';
  const noteState = NOTE_STATES.includes(ns) ? ns : 'draft';

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
      goalData: gd.rows || [],
      noteState,
      lateEntry: Boolean(lateEntry),
      lateEntryReason: String(lateEntryReason || '').trim(),
    },
  };
}

module.exports = {
  SESSION_STATUS,
  NOTE_STATES,
  validateSessionBody,
};
