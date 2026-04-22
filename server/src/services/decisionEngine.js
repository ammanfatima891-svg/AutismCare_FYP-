/**
 * Clinically Safe Decision Support Engine (DSE)
 *
 * IMPORTANT:
 * - This is NOT a diagnostic system.
 * - Output is risk-based guidance only.
 * - AI facial screening must NOT affect outputs.
 */
function clampNumber(n, { min = -Infinity, max = Infinity } = {}) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.min(max, Math.max(min, x));
}

function isMchatAllowed(ageMonths) {
  return typeof ageMonths === 'number' && ageMonths >= 16 && ageMonths <= 30;
}

function scoreMchat({ ageMonths, mchatScoreNullable }) {
  // Age rule: ignore M-CHAT outside 16–30 months.
  if (!isMchatAllowed(ageMonths)) {
    return { autismRisk: 'IGNORED', mchatApplicable: false, mchatScoreUsed: null, uncertain: false };
  }

  const mchatScore = clampNumber(mchatScoreNullable, { min: 0, max: 20 });
  if (mchatScore === null) {
    // Edge-case: allowed but not completed.
    return { autismRisk: 'INCOMPLETE', mchatApplicable: true, mchatScoreUsed: null, uncertain: false };
  }

  if (mchatScore <= 2) return { autismRisk: 'LOW', mchatApplicable: true, mchatScoreUsed: mchatScore, uncertain: false };
  if (mchatScore <= 7) return { autismRisk: 'MEDIUM', mchatApplicable: true, mchatScoreUsed: mchatScore, uncertain: true };
  return { autismRisk: 'HIGH', mchatApplicable: true, mchatScoreUsed: mchatScore, uncertain: false };
}

function normalizeAsqDomains(asqDomainsOrMap) {
  // Accept either:
  // - array of zones: ['above','close','below']
  // - map of domain -> zone
  if (Array.isArray(asqDomainsOrMap)) {
    return asqDomainsOrMap.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  }
  if (asqDomainsOrMap && typeof asqDomainsOrMap === 'object') {
    return Object.values(asqDomainsOrMap).map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function scoreAsq(asqDomainsOrMap) {
  const values = normalizeAsqDomains(asqDomainsOrMap);
  const below = values.filter((v) => v === 'below').length;
  const close = values.filter((v) => v === 'close').length;
  const above = values.filter((v) => v === 'above').length;

  let developmentStatus = 'NORMAL';
  if (below >= 2) developmentStatus = 'SIGNIFICANT_DELAY';
  else if (below === 1) developmentStatus = 'MILD_DELAY';
  else if (close > 0) developmentStatus = 'MONITOR';

  return { developmentStatus, counts: { below, close, above, totalDomains: values.length } };
}

function combineDecision({ autismRisk, mchatUncertain, developmentStatus, mchatAllowed }) {
  // Clinically safe, non-diagnostic escalation. Developmental delays can warrant action even if autism screening incomplete.
  if (developmentStatus === 'SIGNIFICANT_DELAY' || autismRisk === 'HIGH') {
    return {
      recommendation: 'clinician needed',
      urgencyLevel: 'red',
    };
  }

  if (autismRisk === 'INCOMPLETE' && mchatAllowed) {
    return {
      recommendation: 'Complete M-CHAT-R for autism-specific screening',
      urgencyLevel: 'orange',
    };
  }

  if (autismRisk === 'MEDIUM') {
    return {
      recommendation: mchatUncertain
        ? 'clinician needed (medium M-CHAT score is uncertain without follow-up)'
        : 'clinician needed',
      urgencyLevel: 'orange',
    };
  }

  if (developmentStatus === 'MILD_DELAY') {
    return {
      recommendation: 'clinician needed',
      urgencyLevel: 'orange',
    };
  }

  if (developmentStatus === 'MONITOR') {
    return {
      recommendation: 're-screen later',
      urgencyLevel: 'green',
    };
  }

  return {
    recommendation: 'routine monitoring',
    urgencyLevel: 'green',
  };
}

/**
 * @param {Object} input
 * @param {number} input.ageMonths
 * @param {number|null|undefined} input.mchatScore
 * @param {Array<'above'|'close'|'below'>|Object<string,'above'|'close'|'below'>} input.asqDomains
 */
function evaluateDecisionSupport({ ageMonths, mchatScore = null, asqDomains = [] }) {
  const age = clampNumber(ageMonths, { min: 0, max: 240 });
  const normalizedAge = age === null ? 0 : age;

  const mchat = scoreMchat({ ageMonths: normalizedAge, mchatScoreNullable: mchatScore });
  const asq = scoreAsq(asqDomains);

  const { recommendation, urgencyLevel } = combineDecision({
    autismRisk: mchat.autismRisk,
    mchatUncertain: mchat.uncertain,
    developmentStatus: asq.developmentStatus,
    mchatAllowed: mchat.mchatApplicable,
  });

  return {
    autismRisk: mchat.autismRisk,
    developmentStatus: asq.developmentStatus,
    recommendation,
    urgencyLevel,
    inputsUsed: {
      ageMonths: normalizedAge,
      mchatAllowed: mchat.mchatApplicable,
      mchatScore: mchat.mchatScoreUsed,
      asqCounts: asq.counts,
    },
    safetyNote: 'This is decision support only and not a diagnosis.',
  };
}

module.exports = { evaluateDecisionSupport };

