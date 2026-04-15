/**
 * Single source of truth for "current instant" in application code.
 * Tests may `jest.mock` this module to freeze time and avoid flaky date logic.
 */

function getCurrentTime() {
  return new Date();
}

function getCurrentTimeMs() {
  return getCurrentTime().getTime();
}

/**
 * Whole years since date of birth (non-negative). Used for child age in dashboards.
 */
function getAgeYearsFromDob(dob) {
  if (dob == null) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = getCurrentTime();
  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

/**
 * For infants: months since DOB (0–11 when under one year).
 */
function getAgeMonthsFromDob(dob) {
  if (dob == null) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = getCurrentTime();
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return Math.max(0, months);
}

module.exports = { getCurrentTime, getCurrentTimeMs, getAgeYearsFromDob, getAgeMonthsFromDob };
