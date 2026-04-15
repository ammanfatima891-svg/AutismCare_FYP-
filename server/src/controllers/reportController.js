const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
/**
 * Auto-generated therapy reports (monthly, IEP, clinician, parent) from plan + sessions + assignments + analytics.
 * No manual editing — data is derived from existing collections only.
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { ChildCase } = require('../models/ChildCase');
const { User } = require('../models/User');
const TherapyPlan = require('../models/TherapyPlan');
const SessionLog = require('../models/SessionLog');
const { HomeAssignment } = require('../models/HomeAssignment');
const { ClinicalEvaluation } = require('../models/ClinicalEvaluation');
const { Report, REPORT_TYPES } = require('../models/Report');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { assertUserCaseAccess } = require('../utils/caseAccess');
const { buildUnifiedCaseAnalytics } = require('../services/caseAnalyticsSnapshot');
const { buildProgressEnginePayload } = require('../services/progressEngine');
const { buildIntegratedTherapyReport } = require('../services/reportGenerator');
const { writeIntegratedReportPdf, writeGenericReportPdf } = require('../services/reportPdfService');
const { parseResponseScore } = require('../utils/sessionResponseScore');
const TherapyCase = require('../models/TherapyCase');
const { THERAPY_STATUS } = require('../constants/workflowEnums');

function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = getCurrentTimeMs() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function loadChildDisplay(caseDoc) {
  const parent = await User.findById(caseDoc.parentId).select('firstName lastName children').lean();
  let childName = 'Child';
  let age = null;
  if (parent && Array.isArray(parent.children)) {
    const found = parent.children.find((c) => c && c._id && c._id.toString() === caseDoc.childId.toString());
    if (found) {
      childName = `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
      age = ageFromDob(found.dateOfBirth);
    }
  }
  return {
    childName,
    age,
    caseStatus: caseDoc.status || '',
    riskLevel: caseDoc.riskLevel || '',
  };
}

function sessionScores(sessions) {
  return sessions
    .map((s) => parseResponseScore(s.childResponse))
    .filter((v) => typeof v === 'number' && !Number.isNaN(v));
}

function insufficientCore(plan, sessions, assignments) {
  const hasPlan = plan && (plan.shortTermGoals?.length > 0 || plan.goals?.length > 0 || plan.longTermGoal);
  return !hasPlan && sessions.length === 0 && assignments.length === 0;
}

function normalizeReportType(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'report') return '';
  if (raw === 'session-summary') return 'session';
  if (raw === 'progress-report') return 'progress';
  if (raw === 'therapy-report') return 'therapy';
  if (raw === 'integrated' || raw === 'integrated-report') return 'integrated';
  return raw;
}

function buildMonthlyPayload(ctx) {
  const {
    childInfo,
    plan,
    sessionsAsc,
    analytics,
    evaluation,
  } = ctx;
  const scores = sessionScores(sessionsAsc);
  const avgChildResponse = scores.length ? Number(mean(scores).toFixed(2)) : null;
  const notes = sessionsAsc
    .map((s) => String(s.notes || '').trim())
    .filter(Boolean)
    .slice(-12);

  return {
    childInfo,
    therapyDomains: Array.isArray(plan?.domains) ? plan.domains : [],
    goalsProgress: {
      overallProgressPercent: analytics.overallProgress,
      goals: analytics.goalProgress,
    },
    sessionsSummary: {
      totalSessions: sessionsAsc.length,
      avgChildResponse,
      skipped: sessionsAsc.length === 0,
    },
    activitiesUsed: (analytics.activityEffectiveness || []).slice(0, 15),
    therapistNotes: notes.length ? notes : undefined,
    therapistNotesSkipped: notes.length === 0,
    assignmentCompliance: analytics.assignmentStats,
    clinicalContext: evaluation
      ? {
          diagnosisSummary: String(evaluation.diagnosis || '').trim() || undefined,
          recommendations: String(evaluation.recommendations || '').trim() || undefined,
        }
      : undefined,
  };
}

function buildIepPayload(ctx) {
  const { plan, analytics } = ctx;
  const short = Array.isArray(plan?.shortTermGoals) ? plan.shortTermGoals : [];
  const legacy = Array.isArray(plan?.goals) ? plan.goals : [];
  const longTermLegacy = legacy.filter((g) => g && g.type === 'long-term');
  const lt = plan?.longTermGoal;
  const longTermGoals = [];
  if (lt && (lt.title || lt.description)) {
    longTermGoals.push({
      title: lt.title || '',
      description: lt.description || '',
      timeline: lt.timeline || '',
    });
  }
  for (const g of longTermLegacy) {
    longTermGoals.push({
      title: g.title || '',
      description: g.description || '',
      timeline: '',
    });
  }

  const shortTermGoals = short.map((g) => ({
    title: g.title,
    domain: g.domain,
    status: g.status,
    measurableCriteria: g.measurableCriteria || '',
    reviewDate: g.reviewDate || null,
  }));

  const strategies = [];
  const acts = Array.isArray(plan?.activities) ? plan.activities : [];
  for (const a of acts) {
    if (a?.title) strategies.push({ title: a.title, description: a.description || '' });
  }

  let nextReview = null;
  for (const g of short) {
    if (g.reviewDate) {
      const d = new Date(g.reviewDate);
      if (!nextReview || d < nextReview) nextReview = d;
    }
  }
  const reviewTimelineWeeks = { min: 4, max: 6 };
  const suggestedReviewBy = nextReview
    ? nextReview.toISOString()
    : new Date(getCurrentTimeMs() + 28 * 24 * 60 * 60 * 1000).toISOString();

  return {
    longTermGoals,
    shortTermGoals,
    goalStatusSummary: analytics.goalProgress.map((g) => ({
      goalName: g.goalName,
      status: g.status || 'Active',
      progressPercent: g.progressPercent,
    })),
    recommendedStrategies: strategies,
    reviewTimeline: {
      weeksRange: reviewTimelineWeeks,
      suggestedReviewBy,
    },
  };
}

function buildClinicianPayload(ctx) {
  const { childInfo, analytics, evaluation, sessionsAsc } = ctx;
  const redFlags = [];
  for (const d of analytics.domainProgress || []) {
    if (d.progressPercent < 25 && d.trend !== 'improving') {
      redFlags.push({
        domain: d.domain,
        reason: 'Low average goal-linked progress for this domain',
        progressPercent: d.progressPercent,
        trend: d.trend,
      });
    }
    if (d.trend === 'declining') {
      redFlags.push({
        domain: d.domain,
        reason: 'Session-linked response trend is declining',
        progressPercent: d.progressPercent,
        trend: d.trend,
      });
    }
  }

  const obs = sessionsAsc
    .map((s) => String(s.notes || '').trim())
    .filter(Boolean)
    .slice(-8);

  return {
    childInfo,
    diagnosis: evaluation
      ? {
          diagnosis: evaluation.diagnosis || '',
          comorbidConditions: evaluation.comorbidConditions || [],
          developmentalSummary: evaluation.developmentalSummary || '',
          observations: evaluation.observations || '',
        }
      : { diagnosis: '', message: 'No finalized clinical evaluation on file for this case.' },
    therapyProgressSummary: {
      overallProgress: analytics.overallProgress,
      goalProgress: analytics.goalProgress,
    },
    domainAnalysis: analytics.domainProgress,
    redFlags,
    therapistObservations: obs,
  };
}

function buildParentPayload(ctx) {
  const { childInfo, analytics, sessionsAsc, plan } = ctx;
  const improvements = (analytics.domainProgress || [])
    .filter((d) => d.trend === 'improving')
    .map((d) => `${d.domain}: progress trending positively.`);
  const attention = (analytics.domainProgress || [])
    .filter((d) => d.trend === 'declining' || d.progressPercent < 30)
    .map((d) => `${d.domain}: may need extra practice or support.`);

  const tips = [];
  const acts = Array.isArray(plan?.activities) ? plan.activities : [];
  for (const a of acts.slice(0, 5)) {
    if (a?.title) tips.push(`Try structured practice: ${a.title}${a.description ? ` — ${a.description}` : ''}`);
  }
  const instr = sessionsAsc
    .map((s) => String(s.parentInstructions || '').trim())
    .filter(Boolean)
    .slice(-3);
  for (const t of instr) tips.push(`From recent sessions: ${t}`);

  return {
    childInfo,
    progressSummary: `Overall therapy progress is about ${analytics.overallProgress}% based on session responses linked to plan goals.`,
    improvements: improvements.length ? improvements : ['Continue consistent home routines that match therapy targets.'],
    areasNeedingAttention: attention.length ? attention : ['Keep communication open with your therapist about daily observations.'],
    homeGuidanceTips: tips.length ? tips.slice(0, 8) : ['Follow therapist home assignments and celebrate small wins.'],
  };
}

function buildProgressPayload(ctx) {
  const { childInfo, analytics } = ctx;
  return {
    childInfo,
    progressSummary: {
      overallProgressPercent: analytics.overallProgress,
      goalProgress: analytics.goalProgress,
      domainProgress: analytics.domainProgress,
      sessionTrend: analytics.sessionTrend,
    },
    redFlags: (analytics.domainProgress || []).filter(
      (d) => d.trend === 'declining' || Number(d.progressPercent || 0) < 30
    ),
  };
}

function buildSessionPayload(ctx) {
  const { childInfo, sessionsAsc } = ctx;
  const scores = sessionScores(sessionsAsc);
  const avgChildResponse = scores.length ? Number(mean(scores).toFixed(2)) : null;
  const recentSessions = sessionsAsc.slice(-12).reverse().map((s) => ({
    id: s._id,
    sessionDate: s.sessionDate,
    duration: s.duration || 0,
    status: s.status || 'completed',
    goalsTargeted: Array.isArray(s.goalsTargeted) ? s.goalsTargeted : [],
    activitiesUsed: Array.isArray(s.activitiesUsed) ? s.activitiesUsed : [],
    childResponse: s.childResponse || '',
    notes: s.notes || '',
  }));

  return {
    childInfo,
    sessionSummary: {
      totalSessions: sessionsAsc.length,
      avgChildResponse,
      recentSessions,
      skipped: sessionsAsc.length === 0,
    },
  };
}

function buildTherapyPayload(ctx) {
  const { childInfo, plan, analytics } = ctx;
  const shortTermGoals = Array.isArray(plan?.shortTermGoals)
    ? plan.shortTermGoals.map((g) => ({
        title: g.title || '',
        domain: g.domain || '',
        status: g.status || 'Active',
        measurableCriteria: g.measurableCriteria || '',
        reviewDate: g.reviewDate || null,
      }))
    : [];
  const activities = Array.isArray(plan?.activities)
    ? plan.activities.map((a) => ({
        title: a.title || '',
        description: a.description || '',
        linkedGoal: a.linkedGoal || '',
      }))
    : [];

  return {
    childInfo,
    therapyPlanSummary: {
      domains: Array.isArray(plan?.domains) ? plan.domains : [],
      longTermGoal: plan?.longTermGoal || null,
      shortTermGoals,
      activities,
    },
    progress: {
      overallProgressPercent: analytics.overallProgress,
      goals: analytics.goalProgress,
      domains: analytics.domainProgress,
      assignmentCompliance: analytics.assignmentStats,
    },
  };
}

function assembleReportData(type, ctx) {
  const generatedAt = getCurrentTime().toISOString();
  const base = {
    type,
    generatedAt,
    insufficientData: insufficientCore(ctx.plan, ctx.sessionsAsc, ctx.assignments),
  };

  switch (type) {
    case 'monthly':
      return { ...base, ...buildMonthlyPayload(ctx) };
    case 'iep':
      return { ...base, ...buildIepPayload(ctx) };
    case 'clinician':
      return { ...base, ...buildClinicianPayload(ctx) };
    case 'parent':
      return { ...base, ...buildParentPayload(ctx) };
    case 'progress':
      return { ...base, ...buildProgressPayload(ctx) };
    case 'session':
      return { ...base, ...buildSessionPayload(ctx) };
    case 'therapy':
      return { ...base, ...buildTherapyPayload(ctx) };
    case 'integrated': {
      const progressEngine = buildProgressEnginePayload({
        caseId: String(ctx.caseDoc._id),
        plan: ctx.plan,
        sessions: ctx.sessionsAsc,
        assignments: ctx.assignments,
      });
      return {
        ...base,
        ...buildIntegratedTherapyReport({
          childInfo: ctx.childInfo,
          caseDoc: ctx.caseDoc,
          plan: ctx.plan,
          sessionsAsc: ctx.sessionsAsc,
          assignments: ctx.assignments,
          progressEngine,
          evaluation: ctx.evaluation,
        }),
      };
    }
    default:
      return base;
  }
}

/**
 * POST /api/reports/generate/:caseId
 * Progress-engine–aware integrated report (type: integrated).
 */
exports.generateReportByCaseId = async (req, res) => {
  try {
    const { caseId } = req.params || {};
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const therapistId = req.user._id;
    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status || 403).json({ success: false, message: access.message || 'Access denied' });
    }

    // Strict workflow dependency: reports can only be generated for valid therapy states.
    const therapyCase = await TherapyCase.findOne({
      caseId,
      therapistId,
      status: { $in: [THERAPY_STATUS.ACTIVE, THERAPY_STATUS.COMPLETED] },
    })
      .select('_id status')
      .lean();
    if (!therapyCase) {
      return res.status(400).json({
        success: false,
        message: 'Reports can only be generated for ACTIVE or COMPLETED therapy cases.',
        errorCode: 'INVALID_THERAPY_STATE',
      });
    }

    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const [plan, sessions, assignments, evaluation] = await Promise.all([
      TherapyPlan.findOne({ caseId, therapistId }).lean(),
      SessionLog.find({ caseId, therapistId }).sort({ sessionDate: 1 }).lean(),
      HomeAssignment.find({ caseId, therapistId }).lean(),
      ClinicalEvaluation.findOne({ caseId, status: 'FINALIZED' }).sort({ createdAt: -1 }).lean(),
    ]);

    const sessionsAsc = [...sessions];
    const progressEngine = buildProgressEnginePayload({
      caseId: String(caseId),
      plan,
      sessions: sessionsAsc,
      assignments,
    });
    const childInfo = await loadChildDisplay(caseDoc);

    const data = buildIntegratedTherapyReport({
      childInfo,
      caseDoc,
      plan: plan || {},
      sessionsAsc,
      assignments,
      progressEngine,
      evaluation,
    });

    const doc = await Report.create({
      caseId,
      therapistId,
      type: 'integrated',
      data,
    });

    return res.status(201).json({
      success: true,
      data: {
        reportId: doc._id,
        type: 'integrated',
        generatedAt: doc.data.generatedAt,
        data: doc.data,
      },
    });
  } catch (error) {
    console.error('generateReportByCaseId:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate integrated report' });
  }
};

/**
 * POST /api/reports/generate
 */
exports.generateReport = async (req, res) => {
  try {
    const { caseId } = req.body || {};
    const type = normalizeReportType(req.body?.type || req.body?.reportType);
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }
    if (!type || !REPORT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    const therapistId = req.user._id;
    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status || 403).json({ success: false, message: access.message || 'Access denied' });
    }

    const therapyCase = await TherapyCase.findOne({
      caseId,
      therapistId,
      status: { $in: [THERAPY_STATUS.ACTIVE, THERAPY_STATUS.COMPLETED] },
    })
      .select('_id status')
      .lean();
    if (!therapyCase) {
      return res.status(400).json({
        success: false,
        message: 'Reports can only be generated for ACTIVE or COMPLETED therapy cases.',
        errorCode: 'INVALID_THERAPY_STATE',
      });
    }

    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const [plan, sessions, assignments, evaluation] = await Promise.all([
      TherapyPlan.findOne({ caseId, therapistId }).lean(),
      SessionLog.find({ caseId, therapistId }).sort({ sessionDate: 1 }).lean(),
      HomeAssignment.find({ caseId, therapistId }).lean(),
      ClinicalEvaluation.findOne({ caseId, status: 'FINALIZED' }).sort({ createdAt: -1 }).lean(),
    ]);

    const sessionsAsc = [...sessions];
    const analytics = buildUnifiedCaseAnalytics({ plan, sessions: sessionsAsc, assignments });
    const childInfo = await loadChildDisplay(caseDoc);

    const ctx = {
      caseDoc,
      plan: plan || {},
      sessionsAsc,
      assignments,
      analytics,
      evaluation,
      childInfo,
    };

    const duplicateWindow = new Date(getCurrentTimeMs() - 45 * 1000);
    const recent = await Report.findOne({
      caseId,
      therapistId,
      type,
      createdAt: { $gte: duplicateWindow },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (recent) {
      return res.status(200).json({
        success: true,
        data: {
          reportId: recent._id,
          duplicate: true,
          type: recent.data?.type || type,
          generatedAt: recent.data?.generatedAt || recent.createdAt,
          data: recent.data,
        },
      });
    }

    const data = assembleReportData(type, ctx);
    const doc = await Report.create({
      caseId,
      therapistId,
      type,
      data,
    });

    return res.status(201).json({
      success: true,
      data: {
        reportId: doc._id,
        type: doc.data.type,
        generatedAt: doc.data.generatedAt,
        data: doc.data,
      },
    });
  } catch (error) {
    console.error('generateReport:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

/**
 * GET /api/reports
 * Therapist list page (all owned reports with optional filters).
 */
exports.listMyReports = async (req, res) => {
  try {
    const role = String(req.user.role || req.jwtRole || '').toLowerCase();
    if (role !== 'therapist') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const therapistId = req.user._id;
    const { caseId, type, from, to } = req.query || {};
    const filter = { therapistId };

    if (caseId) {
      if (!mongoose.Types.ObjectId.isValid(caseId)) {
        return res.status(400).json({ success: false, message: 'Invalid caseId filter' });
      }
      filter.caseId = caseId;
    }

    const normType = normalizeReportType(type);
    if (normType) {
      if (!REPORT_TYPES.includes(normType)) {
        return res.status(400).json({ success: false, message: 'Invalid report type filter' });
      }
      filter.type = normType;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(String(from));
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid from date' });
        }
        filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(String(to));
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid to date' });
        }
        filter.createdAt.$lte = toDate;
      }
    }

    const rows = await Report.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        id: r._id,
        caseId: r.caseId,
        type: r.type,
        therapistId: r.therapistId,
        generatedAt: r.data?.generatedAt || r.createdAt,
        insufficientData: Boolean(r.data?.insufficientData),
        childName: r.data?.childInfo?.childName || 'Child',
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('listMyReports:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
};

/**
 * GET /api/reports/:caseId
 */
exports.listReportsByCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const gate = await assertUserCaseAccess(req, caseId);
    if (!gate.ok) {
      return res.status(gate.status || 403).json({ success: false, message: gate.message || 'Access denied' });
    }

    const role = String(req.user.role || req.jwtRole || '').toLowerCase();
    const filter = { caseId };
    if (role === 'parent') {
      filter.type = 'parent';
    } else if (role === 'clinician') {
      filter.type = { $in: ['clinician', 'integrated'] };
    }

    const rows = await Report.find(filter).sort({ createdAt: -1 }).limit(80).lean();
    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        id: r._id,
        caseId: r.caseId,
        type: r.type,
        therapistId: r.therapistId,
        generatedAt: r.data?.generatedAt || r.createdAt,
        insufficientData: Boolean(r.data?.insufficientData),
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('listReportsByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to list reports' });
  }
};

/**
 * GET /api/reports/view/:id
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report id' });
    }

    const report = await Report.findById(id).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const gate = await assertUserCaseAccess(req, report.caseId);
    if (!gate.ok) {
      return res.status(gate.status || 403).json({ success: false, message: gate.message || 'Access denied' });
    }

    const role = String(req.user.role || req.jwtRole || '').toLowerCase();
    const t = report.type;
    if (role === 'parent' && t !== 'parent') {
      return res.status(403).json({ success: false, message: 'Not allowed to view this report type' });
    }
    if (role === 'clinician' && t !== 'clinician' && t !== 'integrated') {
      return res.status(403).json({ success: false, message: 'Not allowed to view this report type' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: report._id,
        caseId: report.caseId,
        type: report.type,
        therapistId: report.therapistId,
        generatedAt: report.data?.generatedAt || report.createdAt,
        data: report.data,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error('getReportById:', error);
    return res.status(500).json({ success: false, message: 'Failed to load report' });
  }
};

/**
 * GET /api/reports/:reportId/download
 * Generates PDF on first request, caches path on the report document.
 */
exports.downloadReportPdf = async (req, res) => {
  try {
    const { reportId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ success: false, message: 'Invalid report id' });
    }

    const report = await Report.findById(reportId).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const role = String(req.user.role || req.jwtRole || '').toLowerCase();

    if (role === 'therapist') {
      if (String(report.therapistId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      const access = await assertTherapistCaseAccess(req, String(report.caseId), req.user._id);
      if (!access.ok) {
        return res.status(access.status || 403).json({ success: false, message: access.message || 'Access denied' });
      }
    } else {
      const gate = await assertUserCaseAccess(req, report.caseId);
      if (!gate.ok) {
        return res.status(gate.status || 403).json({ success: false, message: gate.message || 'Access denied' });
      }
      const t = report.type;
      if (role === 'parent' && t !== 'parent') {
        return res.status(403).json({ success: false, message: 'Not allowed to download this report type' });
      }
      if (role === 'clinician' && t !== 'clinician' && t !== 'integrated') {
        return res.status(403).json({ success: false, message: 'Not allowed to download this report type' });
      }
    }

    let rel = report.pdfRelativePath && String(report.pdfRelativePath).trim();
    const ensurePdf = async () => {
      if (report.type === 'integrated') {
        return writeIntegratedReportPdf(report._id, report.data || {});
      }
      return writeGenericReportPdf(report._id, report.type, report.data || {});
    };

    if (!rel) {
      rel = await ensurePdf();
      await Report.updateOne({ _id: report._id }, { $set: { pdfRelativePath: rel } });
    }

    const safeRel = String(rel).replace(/^\/+/, '');
    const absPath = path.join(process.cwd(), safeRel);
    if (!fs.existsSync(absPath)) {
      rel = await ensurePdf();
      await Report.updateOne({ _id: report._id }, { $set: { pdfRelativePath: rel } });
      const safe2 = String(rel).replace(/^\/+/, '');
      const abs2 = path.join(process.cwd(), safe2);
      if (!fs.existsSync(abs2)) {
        return res.status(500).json({ success: false, message: 'PDF file could not be created' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="therapy-report-${reportId}.pdf"`);
      return res.sendFile(abs2);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="therapy-report-${reportId}.pdf"`);
    return res.sendFile(absPath);
  } catch (error) {
    console.error('downloadReportPdf:', error);
    return res.status(500).json({ success: false, message: 'Failed to download report' });
  }
};
