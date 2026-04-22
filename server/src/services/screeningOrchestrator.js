/**
 * Screening Orchestrator (guided, not forced)
 *
 * Returns an age-based plan describing which screeners are allowed and the
 * recommended order. This is guidance only; the UI may allow controlled skips.
 */
function getScreeningPlan(ageMonths, context = {}) {
  const age = typeof ageMonths === 'number' ? ageMonths : Number(ageMonths);
  const months = Number.isFinite(age) ? age : null;

  const plan = {
    allowed: ['ASQ3'],
    recommendedOrder: ['ASQ3'],
    fallbackOrder: ['ASQ3'],
    mchatAllowed: false,
    message:
      'We recommend ASQ-3 as a general developmental screening. (Guidance only; not a diagnosis.)',
  };

  if (months == null) {
    return {
      ...plan,
      message:
        'We could not determine age in months. You can still complete ASQ-3 as a general developmental screening. (Guidance only; not a diagnosis.)',
      contextUsed: { ...context, ageMonths: null },
    };
  }

  if (months < 16) {
    return {
      ...plan,
      message:
        'For this age, ASQ-3 is the recommended general developmental screening. M-CHAT-R is typically used only for 16–30 months.',
      contextUsed: { ...context, ageMonths: months },
    };
  }

  if (months >= 16 && months <= 30) {
    return {
      allowed: ['MCHAT', 'ASQ3'],
      recommendedOrder: ['MCHAT', 'ASQ3'],
      fallbackOrder: ['ASQ3'],
      mchatAllowed: true,
      message:
        'For 16–30 months, we recommend starting with M-CHAT-R (autism-specific) and then completing ASQ-3 (developmental domains). You can still skip ahead if needed.',
      contextUsed: { ...context, ageMonths: months },
    };
  }

  // months > 30
  return {
    ...plan,
    message:
      'For this age, ASQ-3 is the recommended general developmental screening. M-CHAT-R is typically used only for 16–30 months.',
    contextUsed: { ...context, ageMonths: months },
  };
}

module.exports = { getScreeningPlan };

