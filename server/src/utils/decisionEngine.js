function uniq(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function getPrimaryDiagnosis(diagnosis) {
  if (!diagnosis) return '';
  if (typeof diagnosis === 'string') return diagnosis.trim();
  if (diagnosis.primary === 'Other') return String(diagnosis.primaryFreeText || '').trim();
  return String(diagnosis.primary || '').trim();
}

function getFollowUpText(recommendations) {
  if (!recommendations || typeof recommendations === 'string') return '';
  if (recommendations.followUp === 'Other') return String(recommendations.followUpFreeText || '').trim();
  return String(recommendations.followUp || '').trim();
}

/**
 * Hybrid CDSS decision engine (suggestions only).
 *
 * Sources used to design rules (high-level):
 * - M-CHAT-R/F official scoring + actions (mchatscreen.com): refer for EI + diagnostic eval on positive screen.
 * - ASQ-3 follow-up guidance (agesandstages.com): monitoring zone -> activities + rescreen; below cutoff -> referral for evaluation.
 * - NICE CG128: recognition/referral to MDT autism team; assess coexisting conditions.
 * - NICE CG170 + CDC autism treatment pages: common intervention categories.
 * - AAP 2020 ASD clinical report summaries: refer to EI + diagnostic evaluation; consider audiology.
 * - ASHA (Late Language Emergence): include hearing screening/audiology assessment in language delay pathways.
 *
 * Note: We do NOT diagnose; we surface conservative, explainable suggestions.
 */
function evaluateDecision(data) {
  const result = {
    referralRequired: false, // "strong" referral trigger
    suggestedSpecialists: [],
    suggestFurtherTesting: false,
    reasons: [],
  };

  const primary = getPrimaryDiagnosis(data?.diagnosis);
  const severityLevel = data?.diagnosis && typeof data.diagnosis === 'object' ? data.diagnosis.severityLevel : '';
  const confidence = data?.diagnosis && typeof data.diagnosis === 'object' ? data.diagnosis.confidence : '';

  const obsTags =
    data?.observations && typeof data.observations === 'object' && Array.isArray(data.observations.tags)
      ? data.observations.tags.map((t) => String(t))
      : [];

  const comorbid = Array.isArray(data?.comorbidConditions) ? data.comorbidConditions.map((c) => String(c)) : [];

  const mchat = data?.developmentalSummary && typeof data.developmentalSummary === 'object' ? data.developmentalSummary.mchat : null;
  const asq3 = data?.developmentalSummary && typeof data.developmentalSummary === 'object' ? data.developmentalSummary.asq3 : null;

  // ---- Autism (ASD) rules ----
  if (primary === 'ASD') {
    // NICE CG128 encourages MDT assessment and assessment of coexisting conditions.
    result.suggestedSpecialists.push('Further Testing'); // interpreted as "additional assessment / diagnostic evaluation"
    result.reasons.push('Primary diagnosis indicates ASD; consider multidisciplinary diagnostic assessment.');

    // Severity mapping -> stronger referral triggers for Level 2/3.
    if (severityLevel === 'Level 2' || severityLevel === 'Level 3') {
      result.referralRequired = true;
      result.suggestedSpecialists.push('Speech Therapist', 'Behavioral Therapist', 'Occupational Therapist');
      result.reasons.push(`ASD severity ${severityLevel} suggests higher support needs; recommend therapy referrals.`);
    } else {
      // Level 1 / unspecified: still suggest common pathways but not "required".
      result.suggestedSpecialists.push('Speech Therapist', 'Parent Training');
      result.reasons.push('ASD suspected/identified; consider early intervention supports without waiting for final diagnosis.');
    }
  }

  // ---- Screening-driven rules (M-CHAT-R/F) ----
  // We only have riskLevel/result from stored submissions; map conservatively.
  const mchatRisk = mchat?.riskLevel ? String(mchat.riskLevel).toLowerCase() : '';
  const mchatResult = mchat?.result ? String(mchat.result).toLowerCase() : '';
  if (mchatRisk === 'high' || mchatResult === 'fail') {
    // M-CHAT official: positive -> refer for EI + diagnostic evaluation.
    result.referralRequired = true;
    result.suggestedSpecialists.push('Further Testing');
    result.reasons.push('M-CHAT indicates high likelihood; refer for early intervention and diagnostic evaluation.');
  } else if (mchatRisk === 'medium' || mchatResult === 'monitor') {
    // M-CHAT moderate risk -> follow-up interview; if still positive then referral.
    result.suggestFurtherTesting = true;
    result.suggestedSpecialists.push('Further Testing');
    result.reasons.push('M-CHAT indicates moderate likelihood; consider follow-up interview and rescreening.');
  }

  // ---- ASQ-3 domain status rules ----
  // Endpoint maps domainStatuses to {label, flag}; label may include "At risk"/"Need monitoring".
  const domainStatuses = asq3?.domainStatuses && typeof asq3.domainStatuses === 'object' ? asq3.domainStatuses : null;
  if (domainStatuses) {
    const entries = Object.entries(domainStatuses);
    const anyAtRisk = entries.some(([_, v]) => String(v?.label || '').toLowerCase().includes('risk') || String(v?.label || '').toLowerCase().includes('further'));
    const anyMonitoring = entries.some(([_, v]) => String(v?.label || '').toLowerCase().includes('monitor'));

    if (anyAtRisk) {
      result.suggestedSpecialists.push('Further Testing', 'Early Intervention');
      result.reasons.push('ASQ-3 suggests domains needing further evaluation; consider EI and targeted assessments.');
    } else if (anyMonitoring) {
      result.suggestFurtherTesting = true;
      result.reasons.push('ASQ-3 monitoring zone: provide activities and rescreen sooner (e.g., 2–3 months).');
    }
  }

  // ---- Speech / language concerns ----
  if (primary === 'Speech Delay' || obsTags.includes('Delayed Speech')) {
    // ASHA + AAP hearing guidance: language delay -> SLP evaluation + audiology/hearing assessment.
    result.suggestedSpecialists.push('Speech Therapist', 'Audiologist');
    result.reasons.push('Speech/language concerns: consider SLP evaluation and audiology/hearing assessment.');
  }

  // ---- ADHD / Anxiety / Epilepsy comorbidity mapping ----
  if (primary === 'ADHD' || comorbid.includes('ADHD')) {
    result.suggestedSpecialists.push('Further Testing');
    result.reasons.push('ADHD suspected/present: consider specialist assessment and support pathways.');
  }
  if (comorbid.includes('Anxiety')) {
    result.suggestedSpecialists.push('Child Psychologist');
    result.reasons.push('Anxiety noted: consider mental health assessment/support if functionally impairing.');
  }
  if (comorbid.includes('Epilepsy')) {
    result.referralRequired = true; // treat as urgent specialist pathway suggestion
    result.suggestedSpecialists.push('Pediatric Neurologist');
    result.reasons.push('Epilepsy noted: NICE epilepsy guidance supports urgent specialist assessment.');
  }

  // ---- Low confidence ----
  if (confidence === 'Low') {
    result.suggestFurtherTesting = true;
    result.suggestedSpecialists.push('Further Testing');
    result.reasons.push('Low diagnostic confidence: suggest additional testing/assessment before definitive decisions.');
  }

  // ---- Recommendations cross-check ----
  const followUp = getFollowUpText(data?.recommendations);
  if (!followUp) {
    // Not a decision, but useful signal for UI; keep as reason only.
    result.reasons.push('Follow-up interval not specified.');
  }

  result.suggestedSpecialists = uniq(result.suggestedSpecialists);
  result.reasons = uniq(result.reasons);
  return result;
}

module.exports = { evaluateDecision };

