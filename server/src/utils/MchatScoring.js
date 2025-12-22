exports.scoreMCHATFromDB = (questionnaire, responses) => {
  let score = 0;
  let elevatedItems = [];

  const responseMap = {};
  responses.forEach(({ questionId, answer }) => {
    if (questionId != null) responseMap[questionId] = answer;
  });

  const YES_VALUES = new Set(["yes", "1"]);
  const NO_VALUES  = new Set(["no", "0"]);

  questionnaire.questions.forEach((question) => {
    const answerRaw = responseMap[question.questionId];
    if (answerRaw == null) return;

    const normalized = String(answerRaw).toLowerCase().trim();
    const isReverse = question.reverseScored === true;

    const isElevated =
      (!isReverse && NO_VALUES.has(normalized)) ||
      (isReverse && YES_VALUES.has(normalized));

    if (isElevated) {
      score++;
      elevatedItems.push(question.questionId);
    }
  });

  let resultLabel = "";
  let resultDescription = "";

  if (score <= 2) {
    resultLabel = "Pass";
    resultDescription =
      "Low likelihood for autism. No Follow-Up needed. Child has screened negative. Rescreen at 24 months if under 2 years old.";
  } else if (score <= 7) {
    resultLabel = "Monitor";
    resultDescription =
      "Pass needs follow-up.";
  } else {
    resultLabel = "Fail";
    resultDescription =
      "High risk. Immediate evaluation needed by professional.";
  }

  return {
    totalScore: score,
    elevatedItems,
    resultLabel,
    resultDescription,
  };
};
