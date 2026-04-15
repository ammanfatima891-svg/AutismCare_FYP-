const SessionLog = require('../models/SessionLog');
const { parseResponseScore } = require('./sessionResponseScore');

const MEASUREMENT = SessionLog.GOAL_DATA_MEASUREMENT || [
  'accuracy_trials',
  'frequency',
  'duration',
  'latency',
  'rating_1_5',
];

/**
 * @param {unknown} raw
 * @returns {{ ok: boolean, message?: string, rows?: object[] }}
 */
function validateGoalDataArray(raw) {
  if (raw == null) return { ok: true, rows: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'goalData must be an array when provided' };
  }
  const rows = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i];
    if (!row || typeof row !== 'object') {
      return { ok: false, message: `goalData[${i}] must be an object` };
    }
    const goalId = String(row.goalId || '').trim();
    const goalKey = String(row.goalKey || '').trim();
    const goalTitleMatch = String(row.goalTitleMatch || '').trim();
    if (!goalKey && !goalTitleMatch && !goalId) {
      return { ok: false, message: `goalData[${i}] requires goalId, goalKey, or goalTitleMatch` };
    }
    let measurementType = MEASUREMENT.includes(row.measurementType)
      ? row.measurementType
      : 'rating_1_5';

    const out = {
      goalId,
      goalKey,
      goalTitleMatch,
      measurementType,
      trials: undefined,
      correct: undefined,
      count: undefined,
      seconds: undefined,
      rating: undefined,
      promptLevel: row.promptLevel != null ? String(row.promptLevel) : '',
      setting: row.setting != null ? String(row.setting) : '',
      notes: String(row.notes || '').trim(),
      source: row.source === 'legacy_estimate' ? 'legacy_estimate' : 'therapist',
      score: undefined,
    };

    if (row.score != null && row.score !== '' && measurementType !== 'accuracy_trials') {
      const sc = Number(row.score);
      if (!Number.isFinite(sc) || sc < 0 || sc > 5) {
        return { ok: false, message: `goalData[${i}]: score must be 0–5` };
      }
      out.measurementType = MEASUREMENT.includes('score') ? 'score' : 'rating_1_5';
      out.score = sc;
      rows.push(out);
      continue;
    }

    if (measurementType === 'accuracy_trials') {
      const trials = Number(row.trials);
      const correct = Number(row.correct);
      if (!Number.isFinite(trials) || trials <= 0) {
        return { ok: false, message: `goalData[${i}]: trials must be a positive number` };
      }
      if (!Number.isFinite(correct) || correct < 0 || correct > trials) {
        return { ok: false, message: `goalData[${i}]: correct must be between 0 and trials` };
      }
      out.trials = trials;
      out.correct = correct;
    } else if (measurementType === 'frequency') {
      const count = Number(row.count);
      if (!Number.isFinite(count) || count < 0) {
        return { ok: false, message: `goalData[${i}]: count must be a non-negative number` };
      }
      out.count = count;
    } else if (measurementType === 'duration' || measurementType === 'latency') {
      const seconds = Number(row.seconds);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return { ok: false, message: `goalData[${i}]: seconds must be a non-negative number` };
      }
      out.seconds = seconds;
    } else {
      const rating = Number(row.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return { ok: false, message: `goalData[${i}]: rating must be 1–5 for rating_1_5` };
      }
      out.rating = rating;
    }

    rows.push(out);
  }
  return { ok: true, rows };
}

/**
 * If goalData covers all goalsTargeted with rating or accuracy, derive a session-level childResponse for legacy charts.
 * @param {string[]} goalsTargeted
 * @param {object[]} goalRows
 */
function deriveChildResponseFromGoalData(goalsTargeted, goalRows) {
  const targets = new Set((goalsTargeted || []).map((g) => String(g).trim()).filter(Boolean));
  if (targets.size === 0) return null;
  const ratings = [];
  const acc = [];
  for (const row of goalRows || []) {
    const label = String(row.goalTitleMatch || '').trim();
    const key = String(row.goalKey || '').trim();
    const matches =
      (label && targets.has(label)) ||
      (key && [...targets].some((t) => t === key || t.includes(key) || key.includes(t)));
    if (!matches) continue;
    if (row.measurementType === 'rating_1_5' && row.rating != null) {
      ratings.push(Number(row.rating));
    }
    if (row.measurementType === 'accuracy_trials' && row.trials > 0) {
      acc.push((100 * Number(row.correct)) / Number(row.trials));
    }
  }
  if (ratings.length > 0) {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const rounded = Math.max(1, Math.min(5, Math.round(avg)));
    return `scale:${rounded}`;
  }
  if (acc.length > 0) {
    const meanPct = acc.reduce((a, b) => a + b, 0) / acc.length;
    return `${Math.round(meanPct)}%`;
  }
  return null;
}

/**
 * When goalData is absent, build legacy_estimate rows from goalsTargeted + childResponse (low confidence).
 */
function buildLegacyGoalDataFromSession(goalsTargeted, childResponse) {
  const score = parseResponseScore(String(childResponse || ''));
  if (score == null) return [];
  const rating = Math.max(1, Math.min(5, Math.round(score / 20) || 3));
  return (goalsTargeted || []).map((g) => ({
    goalKey: '',
    goalTitleMatch: String(g).trim(),
    measurementType: 'rating_1_5',
    rating,
    source: 'legacy_estimate',
  }));
}

/**
 * Non-blocking linkage hints for session APIs (does not replace validateSessionGoalData).
 * @param {object|null} plan — TherapyPlan lean doc
 * @param {object[]} goalRows — validated goalData rows
 * @returns {{ code: string, message: string }[]}
 */
function collectGoalDataLinkageWarnings(plan, goalRows) {
  const warnings = [];
  if (!plan || !Array.isArray(goalRows)) return warnings;
  const st = Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [];
  const hasPlanGoalIds = st.some((g) => String(g.goalId || '').trim());
  for (let i = 0; i < goalRows.length; i += 1) {
    const r = goalRows[i];
    if (hasPlanGoalIds && !String(r.goalId || '').trim()) {
      warnings.push({
        code: 'missing_goal_id',
        message: `goalData[${i}]: plan uses goalId — add goalId on session rows for stronger audit linkage`,
      });
    }
    if (r.source === 'legacy_estimate') {
      warnings.push({
        code: 'legacy_estimate',
        message: `goalData[${i}]: derived from session-level response — verify against direct measurements when possible`,
      });
    }
  }
  return warnings;
}

module.exports = {
  validateGoalDataArray,
  deriveChildResponseFromGoalData,
  buildLegacyGoalDataFromSession,
  collectGoalDataLinkageWarnings,
};
