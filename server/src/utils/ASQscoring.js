// utils/ASQscoring.js
const ASQ_CUTOFFS = require("./asqCutoffs");


// ASQ item scoring
const SCORE_MAP = {
  yes: 10,
  sometimes: 5,
  "not-yet": 0,
};

/**
 * Score ASQ-3 questionnaire
 * @param {Array} questions - questions from DB (with domain, questionId)
 * @param {Array} responses - [{ questionId, answer }]
 * @param {Number} intervalMonths - ASQ interval (e.g. 2, 4, 6, ...)
 * @returns {Object}
 */
exports.scoreASQ = (questions, responses, intervalMonths) => {
  if (!ASQ_CUTOFFS[intervalMonths]) {
    throw new Error(`ASQ cutoffs not found for interval ${intervalMonths}`);
  }

  const cutoffs = ASQ_CUTOFFS[intervalMonths];

  // Normalize domains (remove spaces to match cutoff keys)
  const normalizeDomain = (domain) => domain.replace(/\s+/g, "");

  const DOMAIN_MAP = {
    "Communication": "Communication",
    "Gross Motor": "GrossMotor",
    "Fine Motor": "FineMotor",
    "Problem Solving": "ProblemSolving",
    "Personal-Social": "PersonalSocial"
  };

  // Build lookup for responses
  const responseMap = {};
  responses.forEach(({ questionId, answer }) => {
    if (questionId && answer) {
      responseMap[questionId] = String(answer).toLowerCase();
    }
  });

  // Initialize domain tracking
  const domainData = {};
  questions.forEach((q) => {
    if (!domainData[q.domain]) {
      domainData[q.domain] = {
        total: 0,
        answered: 0,
      };
    }
  });

  // Score items
  questions.forEach((q) => {
    const ans = responseMap[q.questionId];
    if (!ans || !(ans in SCORE_MAP)) return;

    domainData[q.domain].total += SCORE_MAP[ans];
    domainData[q.domain].answered += 1;
  });

  // Final domain scores & interpretation
  const domainScores = {};
  const domainStatuses = {};
  let hasReferral = false;
  let hasMonitor = false;

  Object.entries(domainData).forEach(([domain, data]) => {
    if (data.answered === 0) {
      domainScores[domain] = null;
      domainStatuses[domain] = "incomplete";
      return;
    }

    // Adjust score if missing items
    const adjustedScore =
      data.answered < 6 ? (data.total / data.answered) * 6 : data.total;

    const roundedScore = Math.round(adjustedScore);
    domainScores[domain] = roundedScore;
    
   
const cutoffKey = DOMAIN_MAP[domain] || normalizeDomain(domain);
const domainCutoff = cutoffs[cutoffKey];
    

    if (!domainCutoff) {
      console.warn(
        `Warning: Cutoffs missing for domain '${domain}' (normalized: '${cutoffKey}')`
      );
      domainStatuses[domain] = "unknown";
      return;
    }

    const { referral, monitor } = domainCutoff;

    if (roundedScore < referral) {
      domainStatuses[domain] = "referral for further evaluation";
      hasReferral = true;
    } else if (roundedScore < monitor) {
      domainStatuses[domain] = "need monitoring";
      hasMonitor = true;
    } else {
      domainStatuses[domain] = "normal development";
    }
  });

  // Overall result
  let resultLabel = "Pass";
  let resultDescription = "Child developing within expected range";

  if (hasReferral) {
    resultLabel = "Fail";
    resultDescription =
      "Further developmental evaluation recommended";
  } else if (hasMonitor) {
    resultLabel = "Monitor";
    resultDescription =
      "Development should be monitored and rescreened";
  }

  return {
    totalScore: null, // ASQ-3 has NO total score
    domainScores,
    domainStatuses,
    resultLabel,
    resultDescription,
  };
};
