/**
 * Calculate age in months from date of birth
 * @param {Date} dateOfBirth - The date of birth
 * @returns {number} Age in months
 */
function calculateAgeInMonths(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  // Adjust if the current month is before the birth month
  if (months < 0) {
    years--;
    months += 12;
  }

  // Adjust if the current day is before the birth day
  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  return years * 12 + months;
}

/**
 * Calculate age in years (decimal)
 * @param {Date} dateOfBirth - The date of birth
 * @returns {number} Age in years with decimal precision
 */
function calculateAgeInYears(dateOfBirth) {
  const ageInMonths = calculateAgeInMonths(dateOfBirth);
  return ageInMonths / 12;
}

/**
 * Get the appropriate ASQ interval based on age in months
 * @param {number} ageInMonths - Age in months
 * @returns {string} ASQ interval (e.g., '12', '18', '24')
 */
function getASQInterval(ageInMonths) {
  if (ageInMonths >= 2 && ageInMonths < 4) return '2';
  if (ageInMonths >= 4 && ageInMonths < 6) return '4';
  if (ageInMonths >= 6 && ageInMonths < 9) return '6';
  if (ageInMonths >= 9 && ageInMonths < 12) return '9';
  if (ageInMonths >= 12 && ageInMonths < 15) return '12';
  if (ageInMonths >= 15 && ageInMonths < 18) return '15';
  if (ageInMonths >= 18 && ageInMonths < 24) return '18';
  if (ageInMonths >= 24 && ageInMonths < 30) return '24';
  if (ageInMonths >= 30 && ageInMonths < 36) return '30';
  if (ageInMonths >= 36 && ageInMonths < 48) return '36';
  if (ageInMonths >= 48 && ageInMonths < 60) return '48';
  if (ageInMonths >= 60 && ageInMonths <= 66) return '60';

  // Return default interval for ages outside the range
  return '2';
}

/**
 * Check if child is eligible for M-CHAT-R (16 months and older)
 * @param {Date} dateOfBirth - The date of birth
 * @returns {boolean} True if eligible for M-CHAT-R
 */
function isEligibleForMCHAT(dateOfBirth) {
  const ageInMonths = calculateAgeInMonths(dateOfBirth);
  return ageInMonths >= 16;
}

/**
 * Calculate adjusted age in days, accounting for preterm birth
 * @param {Date|string} dateOfBirth - The date of birth
 * @param {number} weeksPreterm - Number of weeks born preterm (default 0)
 * @returns {number} Adjusted age in days
 */
function calculateAdjustedAgeInDays(dateOfBirth, weeksPreterm = 0) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  const diffTime = today - birthDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays - (weeksPreterm * 7);
}

/**
 * Get child age display string
 * @param {Date} dateOfBirth - The date of birth
 * @returns {string} Age display string (e.g., "2 years 3 months")
 */
function getAgeDisplayString(dateOfBirth) {
  const ageInMonths = calculateAgeInMonths(dateOfBirth);
  const years = Math.floor(ageInMonths / 12);
  const months = ageInMonths % 12;

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''} old`;
  } else if (months === 0) {
    return `${years} year${years !== 1 ? 's' : ''} old`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''} old`;
  }
}

module.exports = {
  calculateAgeInMonths,
  calculateAgeInYears,
  calculateAdjustedAgeInDays,
  getASQInterval,
  isEligibleForMCHAT,
  getAgeDisplayString
};
