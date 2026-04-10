const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parse "HH:mm" or "H:mm" → { h, min } or null.
 */
function parseTimeHHMM(s) {
  const m = String(s || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null;
  return { h, min };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Inclusive range of calendar dates (local timezone).
 */
function eachDateInRange(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  if (end < start) return [];

  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Build SessionSlot payload objects (not yet inserted).
 * @param {object} p
 * @param {string} p.caseId
 * @param {string} p.scheduleId
 * @param {string[]} p.days — e.g. ['Mon','Wed','Fri']
 * @param {string} p.time — '16:00'
 * @param {number} p.duration
 * @param {Date|string} p.startDate
 * @param {Date|string} p.endDate
 */
function buildSlotPayloads({ caseId, scheduleId, days, time, duration, startDate, endDate }) {
  const t = parseTimeHHMM(time);
  if (!t) {
    const err = new Error('time must be HH:mm (24h)');
    err.code = 'INVALID_TIME';
    throw err;
  }

  const daySet = new Set(days);
  const timeStr = `${pad2(t.h)}:${pad2(t.min)}`;
  const dates = eachDateInRange(startDate, endDate);
  const slots = [];

  for (const d of dates) {
    const name = DAY_NAMES[d.getDay()];
    if (!daySet.has(name)) continue;

    const dateOnly = new Date(d);
    dateOnly.setHours(0, 0, 0, 0);

    slots.push({
      caseId,
      scheduleId,
      date: dateOnly,
      time: timeStr,
      duration,
      status: 'scheduled',
    });
  }

  return slots;
}

module.exports = {
  parseTimeHHMM,
  buildSlotPayloads,
  DAY_NAMES,
};
