const mongoose = require('mongoose');
const TherapyPlan = require('../models/TherapyPlan');
const SessionLog = require('../models/SessionLog');
const { ChildCase } = require('../models/ChildCase');
const { parseResponseScore } = require('../utils/sessionResponseScore');

const SUPPORTED_DOMAINS = ['Speech', 'Occupational Therapy', 'Behavioral', 'Sensory', 'AAC', 'PECS'];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferDomainFromText(text) {
  const v = normalizeText(text);
  if (!v) return null;
  if (v.includes('speech') || v.includes('language') || v.includes('communication')) return 'Speech';
  if (v.includes('occupational') || v.includes('ot') || v.includes('fine motor') || v.includes('daily living')) return 'Occupational Therapy';
  if (v.includes('behavior') || v.includes('behaviour') || v.includes('aba')) return 'Behavioral';
  if (v.includes('sensory')) return 'Sensory';
  if (v.includes('aac') || v.includes('augmentative')) return 'AAC';
  if (v.includes('pecs') || v.includes('picture exchange')) return 'PECS';
  return null;
}

function normalizePlanDomains(domains) {
  const list = Array.isArray(domains) ? domains : [];
  const mapped = list
    .map((d) => {
      const s = String(d || '').trim();
      if (s === 'OT') return 'Occupational Therapy';
      if (s === 'Behavioral (ABA)') return 'Behavioral';
      return inferDomainFromText(d) || s;
    })
    .filter(Boolean);
  const supported = mapped.filter((d) => SUPPORTED_DOMAINS.includes(d));
  return [...new Set(supported)];
}

/** Map short-term goal domain from plan builder to analytics bucket keys. */
function mapShortTermDomainToAnalytics(domainRaw) {
  const d = String(domainRaw || '').trim();
  if (d === 'OT') return 'Occupational Therapy';
  if (d === 'Behavioral (ABA)') return 'Behavioral';
  if (SUPPORTED_DOMAINS.includes(d)) return d;
  return inferDomainFromText(d) || d;
}

function getGoalStatus(goal) {
  const rawStatus = normalizeText(goal?.status);
  if (rawStatus === 'achieved' || rawStatus === 'completed' || rawStatus === 'done') return 'achieved';
  return 'active';
}

function groupTrendDataByDate(sessions) {
  const byDate = new Map();
  for (const s of sessions) {
    const score = parseResponseScore(s.childResponse);
    if (score == null) continue;
    const dateKey = new Date(s.sessionDate).toISOString().slice(0, 10);
    const bucket = byDate.get(dateKey) || { sum: 0, count: 0 };
    bucket.sum += score;
    bucket.count += 1;
    byDate.set(dateKey, bucket);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      value: Number((bucket.sum / bucket.count).toFixed(2)),
    }));
}

/**
 * Goals used for completion %: prefer structured shortTermGoals; else legacy non-long-term goals.
 */
function enrichGoalsWithDomain(plan) {
  const planDomains = normalizePlanDomains(plan?.domains);
  const shortTerm = Array.isArray(plan?.shortTermGoals) ? plan.shortTermGoals : [];
  const legacy = Array.isArray(plan?.goals) ? plan.goals : [];

  if (shortTerm.length > 0) {
    return shortTerm.map((g) => ({
      ...g,
      _derivedDomain: mapShortTermDomainToAnalytics(g.domain),
      _derivedStatus: getGoalStatus(g),
    }));
  }

  return legacy
    .filter((goal) => goal.type !== 'long-term')
    .map((goal) => {
      const explicitDomain = inferDomainFromText(goal?.domain);
      const guessedDomain =
        explicitDomain ||
        inferDomainFromText(goal?.title) ||
        inferDomainFromText(goal?.description) ||
        (planDomains.length === 1 ? planDomains[0] : null);
      return {
        ...goal,
        _derivedDomain: guessedDomain,
        _derivedStatus: getGoalStatus(goal),
      };
    });
}

async function assertClinicianCaseOwnership(caseId, clinicianId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return null;
  return ChildCase.findOne({ _id: caseId, clinicianId }).lean();
}

function buildDomainProgress(domains, goals) {
  return domains.map((domain) => {
    const domainGoals = goals.filter((g) => g._derivedDomain === domain);
    const totalGoals = domainGoals.length;
    const achievedGoals = domainGoals.filter((g) => g._derivedStatus === 'achieved').length;
    const progressPercent = totalGoals > 0 ? Number(((achievedGoals / totalGoals) * 100).toFixed(2)) : 0;

    return {
      domain,
      totalGoals,
      achievedGoals,
      progressPercent,
    };
  });
}

/**
 * Shared goal/session analytics for a case (same math as clinician overview).
 * Used by GET /api/progress/:caseId/overview and integration GET /api/case/:caseId/progress.
 */
exports.computeCaseProgressOverview = async function computeCaseProgressOverview(caseId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) {
    return { success: false, error: 'invalid_case' };
  }

  const [plan, sessions] = await Promise.all([
    TherapyPlan.findOne({ caseId }).lean(),
    SessionLog.find({ caseId }).sort({ sessionDate: 1 }).lean(),
  ]);

  if (!plan && sessions.length === 0) {
    return {
      success: true,
      data: {
        overallProgressPercent: 0,
        totalGoals: 0,
        achievedGoals: 0,
        domains: SUPPORTED_DOMAINS.map((domain) => ({
          domain,
          totalGoals: 0,
          achievedGoals: 0,
          progressPercent: 0,
        })),
        trendData: [],
      },
      message: 'No progress data available',
    };
  }

  const enrichedGoals = enrichGoalsWithDomain(plan);
  const totalGoals = enrichedGoals.length;
  const achievedGoals = enrichedGoals.filter((g) => g._derivedStatus === 'achieved').length;
  const overallProgressPercent = totalGoals > 0 ? Number(((achievedGoals / totalGoals) * 100).toFixed(2)) : 0;
  const domains = buildDomainProgress(SUPPORTED_DOMAINS, enrichedGoals);
  const trendData = groupTrendDataByDate(sessions);

  return {
    success: true,
    data: {
      overallProgressPercent,
      totalGoals,
      achievedGoals,
      domains,
      trendData,
    },
  };
};

// GET /api/progress/:caseId/overview
exports.getProgressOverview = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;
    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const result = await exports.computeCaseProgressOverview(caseId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid case id' });
    }

    const body = { success: true, data: result.data };
    if (result.message) body.message = result.message;
    return res.status(200).json(body);
  } catch (error) {
    console.error('getProgressOverview:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch progress overview' });
  }
};

// GET /api/progress/:caseId/domain/:domain
exports.getDomainProgress = async (req, res) => {
  try {
    const { caseId, domain: requestedDomain } = req.params;
    const clinicianId = req.user._id;
    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const domain = inferDomainFromText(requestedDomain) || String(requestedDomain || '').trim();
    if (!SUPPORTED_DOMAINS.includes(domain)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported domain. Use one of: ${SUPPORTED_DOMAINS.join(', ')}`,
      });
    }

    const [plan, sessions] = await Promise.all([
      TherapyPlan.findOne({ caseId }).lean(),
      SessionLog.find({ caseId }).sort({ sessionDate: 1 }).lean(),
    ]);

    const enrichedGoals = enrichGoalsWithDomain(plan);
    const domainGoals = enrichedGoals.filter((g) => g._derivedDomain === domain);
    const totalGoals = domainGoals.length;
    const achievedGoals = domainGoals.filter((g) => g._derivedStatus === 'achieved').length;
    const progressPercent = totalGoals > 0 ? Number(((achievedGoals / totalGoals) * 100).toFixed(2)) : 0;

    const domainSessions = sessions.filter((s) => {
      const combined = [
        ...(Array.isArray(s.goalsTargeted) ? s.goalsTargeted : []),
        ...(Array.isArray(s.activitiesUsed) ? s.activitiesUsed : []),
      ].join(' ');
      return inferDomainFromText(combined) === domain;
    });

    const trendData = groupTrendDataByDate(domainSessions);

    return res.status(200).json({
      success: true,
      data: {
        domain,
        progressPercent,
        totalGoals,
        achievedGoals,
        trendData,
      },
    });
  } catch (error) {
    console.error('getDomainProgress:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch domain progress' });
  }
};

// GET /api/progress/:caseId/sessions
exports.getSessionInsights = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;
    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const sessions = await SessionLog.find({ caseId }).sort({ sessionDate: -1 }).lean();
    const totalSessions = sessions.length;
    const scored = sessions
      .map((s) => parseResponseScore(s.childResponse))
      .filter((v) => typeof v === 'number');

    const averageResponseScore = scored.length
      ? Number((scored.reduce((sum, v) => sum + v, 0) / scored.length).toFixed(2))
      : 0;

    const lastSessionDate = totalSessions ? sessions[0].sessionDate : null;
    const recentActivity = sessions.slice(0, 5).map((s) => ({
      sessionDate: s.sessionDate,
      duration: s.duration || 0,
      goalsTargeted: Array.isArray(s.goalsTargeted) ? s.goalsTargeted : [],
      childResponse: s.childResponse || '',
      responseScore: parseResponseScore(s.childResponse),
      notes: s.notes || '',
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalSessions,
        averageResponseScore,
        lastSessionDate,
        recentActivity,
      },
      message: totalSessions ? undefined : 'No sessions available',
    });
  } catch (error) {
    console.error('getSessionInsights:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch session insights' });
  }
};
