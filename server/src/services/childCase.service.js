const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const Submission = require('../models/Submission');

function inferRiskFromSubmission(sub) {
  if (!sub) return 'unknown';
  if (sub.riskLevel && ['low', 'medium', 'high'].includes(String(sub.riskLevel).toLowerCase())) {
    return String(sub.riskLevel).toLowerCase();
  }
  const r = sub.result;
  if (r === 'Pass') return 'low';
  if (r === 'Monitor') return 'medium';
  if (r === 'Fail') return 'high';
  return 'unknown';
}

/**
 * Build screening summary from Submission collection for a child subdocument id.
 */
async function buildScreeningSummaryForChild(childId) {
  const subs = await Submission.find({ childId })
    .sort({ createdAt: -1 })
    .lean();

  if (!subs.length) {
    return {
      hasScreening: false,
      message: 'No screening data on file for this child.',
      submissions: [],
      latest: null,
    };
  }

  const submissions = subs.map((s) => ({
    submissionId: s._id,
    questionnaireType: s.questionnaireType,
    result: s.result,
    riskLevel: inferRiskFromSubmission(s),
    completedAt: s.createdAt,
    totalScore: s.scores?.totalScore,
  }));

  const latest = subs[0];
  return {
    hasScreening: true,
    message: null,
    submissions,
    latest: {
      questionnaireType: latest.questionnaireType,
      result: latest.result,
      riskLevel: inferRiskFromSubmission(latest),
      resultDescription: latest.resultDescription,
      totalScore: latest.scores?.totalScore,
    },
  };
}

function riskFromSummary(screeningSummary) {
  if (!screeningSummary || !screeningSummary.hasScreening || !screeningSummary.latest) {
    return 'unknown';
  }
  const r = screeningSummary.latest.riskLevel;
  return ['low', 'medium', 'high'].includes(r) ? r : 'unknown';
}

module.exports = {
  buildScreeningSummaryForChild,
  inferRiskFromSubmission,
  riskFromSummary,
};
