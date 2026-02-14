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

  // M-CHAT-R official scoring (mchatscreen.com / M-CHAT-R/F scoring):
  // 0-2 = Low risk, 3-7 = Moderate (Follow-Up), 8-20 = High (refer immediately)
  let resultLabel = "";
  let resultDescription = "";

  if (score <= 2) {
    resultLabel = "Pass";
    resultDescription =
      "The score indicates LOW likelihood for autism. No Follow-Up needed. Child has screened negative. Refer as needed if developmental surveillance or other tools suggest increased likelihood for autism. Rescreen at 24 months if the child is younger than 2 years old.";
  } else if (score <= 7) {
    resultLabel = "Monitor";
    resultDescription =
      "The score indicates MODERATE likelihood for autism. Administer the M-CHAT-R Follow-Up items that correspond to the elevated likelihood responses. Only those items which were scored as elevated likelihood need to be completed. If 2 or more items continue to indicate elevated likelihood, the result is a positive screen. Refer the child immediately for (a) early intervention and (b) diagnostic evaluation.";
  } else {
    resultLabel = "Fail";
    resultDescription =
      "The score indicates HIGH likelihood for autism. The child has screened positive. It is not necessary to complete the M-CHAT-R Follow-Up at this time. Bypass Follow-Up, and refer immediately for (a) early intervention and (b) diagnostic evaluation.";
  }

  return {
    totalScore: score,
    result: resultLabel,
    resultDescription,
    elevatedItems,
  };
};
