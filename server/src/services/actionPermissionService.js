const ACTIONS = {
  BOOK_APPOINTMENT: 'BOOK_APPOINTMENT',
  CREATE_LAB_REQUEST: 'CREATE_LAB_REQUEST',
  UPLOAD_LAB_REPORT: 'UPLOAD_LAB_REPORT',
  CREATE_THERAPY_REFERRAL: 'CREATE_THERAPY_REFERRAL',
  START_THERAPY: 'START_THERAPY',
};

const rules = {
  // Appointment requests are only allowed after screening submission (REVIEW).
  [ACTIONS.BOOK_APPOINTMENT]: ['REVIEW'],
  [ACTIONS.CREATE_LAB_REQUEST]: ['DIAGNOSIS'],
  [ACTIONS.UPLOAD_LAB_REPORT]: ['DIAGNOSIS'],
  // Allow multiple referrals while in THERAPY (pending assignment); block once therapy is active.
  [ACTIONS.CREATE_THERAPY_REFERRAL]: ['DIAGNOSIS_READY', 'THERAPY'],
  [ACTIONS.START_THERAPY]: ['THERAPY'],
};

function isActionAllowed(action, status) {
  const st = String(status || '').trim().toUpperCase();
  const allowed = rules[String(action)] || [];
  return allowed.includes(st);
}

function allowedStatusesForAction(action) {
  return rules[String(action)] ? [...rules[String(action)]] : [];
}

module.exports = {
  ACTIONS,
  rules,
  isActionAllowed,
  allowedStatusesForAction,
};

