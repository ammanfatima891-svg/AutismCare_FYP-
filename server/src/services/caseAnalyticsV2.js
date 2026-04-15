const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
/**
 * Stakeholder-grade KPIs derived from TherapyPlan + SessionLog.goalData + HomeAssignment.
 * Legacy snapshot (caseAnalyticsSnapshot.js) remains for backward-compatible charts.
 */

const { parseResponseScore, parseScale1to5 } = require('../utils/sessionResponseScore');

const DOMAIN_BUCKETS = ['Speech', 'OT', 'Sensory', 'Behavioral'];

function mapPlanDomainToBucket(domainRaw) {
  const d = String(domainRaw || '').trim();
  if (d === 'OT') return 'OT';
  if (d === 'Behavioral (ABA)' || d === 'Behavioral') return 'Behavioral';
  if (d === 'Sensory') return 'Sensory';
  if (d === 'Speech' || d === 'AAC' || d === 'PECS') return 'Speech';
  return 'Speech';
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function linearSlope(y) {
  const n = y.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (i - xMean) * (y[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function normalizedScoreFromGoalRow(row) {
  if (!row) return null;
  if (row.score != null && Number.isFinite(Number(row.score))) {
    return Math.max(0, Math.min(100, (Number(row.score) / 5) * 100));
  }
  const t = row.measurementType;
  if (t === 'accuracy_trials' && row.trials > 0) {
    return (100 * Number(row.correct)) / Number(row.trials);
  }
  if (t === 'rating_1_5' && row.rating != null) {
    return (Number(row.rating) / 5) * 100;
  }
  if (t === 'frequency' && row.count != null && row.targetValue != null && row.targetValue > 0) {
    return Math.min(100, (Number(row.count) / Number(row.targetValue)) * 100);
  }
  if ((t === 'duration' || t === 'latency') && row.seconds != null && row.targetSeconds != null && row.targetSeconds > 0) {
    return Math.min(100, (Number(row.seconds) / Number(row.targetSeconds)) * 100);
  }
  return null;
}

function collectPlanGoals(plan) {
  const out = [];
  const short = Array.isArray(plan?.shortTermGoals) ? plan.shortTermGoals : [];
  for (const g of short) {
    const goalKey = String(g.goalKey || '').trim();
    const extGoalId = String(g.goalId || '').trim();
    const goalName = String(g.title || '').trim();
    const id = g._id ? String(g._id) : '';
    if (!goalName && !goalKey && !id) continue;
    const matchKeys = new Set();
    if (goalName) matchKeys.add(goalName);
    if (id) matchKeys.add(id);
    if (goalKey) matchKeys.add(goalKey);
    if (extGoalId) matchKeys.add(extGoalId);
    const mr = g.masteryRule || {};
    out.push({
      goalKey: goalKey || (id ? `id:${id}` : `title:${goalName}`),
      goalName: goalName || goalKey || id,
      domain: mapPlanDomainToBucket(g.domain),
      status: String(g.status || 'Active'),
      matchKeys,
      measurementType: g.measurement?.type || 'rating_1_5',
      targetValue: g.target?.value != null ? Number(g.target.value) : null,
      targetSeconds: null,
      masteryRule: {
        ruleType: mr.ruleType || 'threshold_out_of_n_sessions',
        threshold: Number(mr.threshold) >= 0 ? Number(mr.threshold) : 80,
        window: Number(mr.window) > 0 ? Number(mr.window) : 5,
        minSessions: Number(mr.minSessions) > 0 ? Number(mr.minSessions) : 3,
      },
      reviewDate: g.reviewDate ? new Date(g.reviewDate) : null,
    });
  }
  return out;
}

function findGoalRowForSession(session, goalDef) {
  const rows = Array.isArray(session.goalData) ? session.goalData : [];
  if (rows.length === 0) return null;
  const byGoalId = rows.find((r) => {
    const gid = String(r.goalId || '').trim();
    return gid && goalDef.matchKeys.has(gid);
  });
  if (byGoalId) return { row: byGoalId, source: 'goalData' };
  const byKey = rows.find((r) => r.goalKey && goalDef.matchKeys.has(String(r.goalKey).trim()));
  if (byKey) return { row: byKey, source: 'goalData' };
  const byTitle = rows.find((r) => {
    const t = String(r.goalTitleMatch || '').trim();
    return t && goalDef.matchKeys.has(t);
  });
  if (byTitle) return { row: byTitle, source: 'goalData' };
  return null;
}

function legacyScoreForSession(session) {
  const scale = parseScale1to5(session.childResponse);
  if (scale != null) return (scale / 5) * 100;
  const s = parseResponseScore(session.childResponse);
  return s != null ? s : null;
}

/**
 * Series of normalized 0–100 scores for a goal across sessions (chronological).
 */
function buildGoalSeries(sessionsAsc, goalDef) {
  const points = [];
  for (const s of sessionsAsc) {
    if (String(s.status || '') !== 'completed') continue;
    const found = findGoalRowForSession(s, goalDef);
    let score = null;
    let row = null;
    if (found?.row) {
      row = { ...found.row, targetValue: goalDef.targetValue, targetSeconds: goalDef.targetSeconds };
      score = normalizedScoreFromGoalRow(row);
    }
    if (score == null) {
      const gt = Array.isArray(s.goalsTargeted) ? s.goalsTargeted : [];
      const hit = gt.some((x) => goalDef.matchKeys.has(String(x).trim()));
      if (hit) {
        score = legacyScoreForSession(s);
      }
    }
    if (score != null) {
      points.push({
        sessionId: String(s._id),
        date: s.sessionDate ? new Date(s.sessionDate).toISOString() : null,
        score,
        source: found?.source || 'legacy_session',
      });
    }
  }
  return points;
}

function classifyTrend(slope) {
  if (slope > 2) return 'improving';
  if (slope < -2) return 'declining';
  return 'stable';
}

function evaluateMastery(series, rule) {
  const { ruleType, threshold, window, minSessions } = rule;
  if (!series.length || series.length < minSessions) {
    return { mastered: false, reason: 'insufficient_data' };
  }
  const vals = series.map((p) => p.score);
  const lastWindow = vals.slice(-window);
  if (ruleType === 'threshold_consecutive_sessions') {
    const ok = lastWindow.length >= window && lastWindow.every((v) => v >= threshold);
    return { mastered: ok, reason: ok ? 'consecutive_threshold' : 'not_met' };
  }
  const avg = mean(lastWindow);
  const mastered = lastWindow.length >= minSessions && avg >= threshold;
  return { mastered, reason: mastered ? 'window_avg' : 'not_met', windowAvg: Number(avg.toFixed(2)) };
}

function stalledDeclining(series, rule) {
  if (series.length < 3) return { stalled: false, declining: false };
  const vals = series.map((p) => p.score).slice(-Math.min(5, series.length));
  const slope = linearSlope(vals);
  const recent = mean(vals);
  const declining = slope < -3;
  const stalled = Math.abs(slope) <= 1 && recent < rule.threshold - 15;
  return { stalled, declining, slope: Number(slope.toFixed(3)) };
}

function assignmentKpis(assignments) {
  let onTime = 0;
  let submittedOrReviewed = 0;
  for (const a of assignments || []) {
    const st = String(a.status || '');
    if (st === 'submitted' || st === 'reviewed' || st === 'completed') {
      submittedOrReviewed += 1;
      const due = a.dueDate ? new Date(a.dueDate).getTime() : null;
      const sub = a.parentSubmission?.submittedAt ? new Date(a.parentSubmission.submittedAt).getTime() : null;
      if (due != null && sub != null && !Number.isNaN(due) && !Number.isNaN(sub) && sub <= due) {
        onTime += 1;
      }
    }
  }
  const onTimeRate =
    submittedOrReviewed > 0 ? Number(((onTime / submittedOrReviewed) * 100).toFixed(2)) : null;
  return { onTimeSubmissions: onTime, submittedOrReviewed, onTimeSubmissionRatePercent: onTimeRate };
}

/**
 * @param {{ plan: object|null, sessions: object[], assignments: object[] }} params
 */
function buildStakeholderAnalyticsBlock({ plan, sessions, assignments }) {
  const planSafe = plan || {};
  const sessionsAsc = [...sessions].sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));

  const goals = collectPlanGoals(planSafe);
  const goalKpis = goals.map((g) => {
    const series = buildGoalSeries(sessionsAsc, g);
    const vals = series.map((p) => p.score);
    const recentWindow = vals.slice(-5);
    const recentPerformance =
      recentWindow.length > 0 ? Number(mean(recentWindow).toFixed(2)) : null;
    const overallAvg = vals.length ? Number(mean(vals).toFixed(2)) : null;
    const slopeSeries = vals.slice(-Math.min(5, vals.length));
    const slope = slopeSeries.length >= 2 ? linearSlope(slopeSeries) : 0;
    const trend = classifyTrend(slope);
    const mastery = evaluateMastery(series, g.masteryRule);
    const sd = stalledDeclining(series, g.masteryRule);

    return {
      goalKey: g.goalKey,
      goalName: g.goalName,
      domain: g.domain,
      planStatus: g.status,
      dataPoints: series.length,
      recentPerformance,
      overallAvg,
      trend,
      trendSlope: Number(slope.toFixed(3)),
      mastery,
      stalled: sd.stalled,
      declining: sd.declining,
      measurementType: g.measurementType,
      series,
    };
  });

  const activeGoals = goalKpis.filter((x) => !['Retired', 'OnHold'].includes(String(x.planStatus)));
  const masteredCount = activeGoals.filter((x) => x.mastery?.mastered).length;
  const improving = activeGoals.filter((x) => x.trend === 'improving').length;
  const declining = activeGoals.filter((x) => x.trend === 'declining').length;
  const stalled = activeGoals.filter((x) => x.stalled).length;
  const lowData = activeGoals.filter((x) => {
    const def = goals.find((g) => g.goalKey === x.goalKey);
    const minS = def?.masteryRule?.minSessions ?? 3;
    return x.dataPoints < minS;
  }).length;

  const domainKpis = DOMAIN_BUCKETS.map((bucket) => {
    const inDom = goalKpis.filter((x) => x.domain === bucket && x.recentPerformance != null);
    const avg =
      inDom.length > 0
        ? Number((inDom.reduce((s, x) => s + (x.recentPerformance || 0), 0) / inDom.length).toFixed(2))
        : null;
    const slopes = inDom.map((x) => x.trendSlope).filter((v) => typeof v === 'number');
    const domSlope = slopes.length ? mean(slopes) : 0;
    return {
      domain: bucket,
      recentAvgPercent: avg,
      trend: classifyTrend(domSlope),
      goalsWithData: inDom.length,
    };
  });

  let completed = 0;
  let missed = 0;
  let rescheduled = 0;
  for (const s of sessionsAsc) {
    const st = String(s.status || 'completed');
    if (st === 'completed') completed += 1;
    else if (st === 'missed') missed += 1;
    else if (st === 'rescheduled') rescheduled += 1;
  }
  const denom = completed + missed + rescheduled;
  const attendanceRatePercent = denom > 0 ? Number(((completed / denom) * 100).toFixed(2)) : null;

  const assignExtra = assignmentKpis(assignments);

  const now = getCurrentTime();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let latestReview = null;
  for (const g of goals) {
    if (g.reviewDate && (!latestReview || g.reviewDate > latestReview)) latestReview = g.reviewDate;
  }
  const planUpdated = planSafe?.updatedAt ? new Date(planSafe.updatedAt) : null;
  const lastTouch = latestReview || planUpdated;
  const reviewRequired = !lastTouch || lastTouch < cutoff;

  const alerts = [];
  if (reviewRequired) alerts.push('Plan or goal review is due (30+ days since last review touch).');
  if (declining > 0) alerts.push(`${declining} goal(s) show a declining trend in recent sessions.`);
  if (stalled > 0) alerts.push(`${stalled} goal(s) appear stalled relative to mastery threshold.`);
  if (assignExtra.onTimeSubmissionRatePercent != null && assignExtra.onTimeSubmissionRatePercent < 50) {
    alerts.push('Home assignment on-time submission rate is below 50%.');
  }

  const kpis = {
    goalsTracked: goals.length,
    goalsMastered: masteredCount,
    goalsImproving: improving,
    goalsDeclining: declining,
    goalsStalled: stalled,
    goalsLowData: lowData,
    attendance: {
      completed,
      missed,
      rescheduled,
      attendanceRatePercent,
    },
    homeProgram: assignExtra,
  };

  const planMeta = {
    planVersion: planSafe.planVersion != null ? Number(planSafe.planVersion) : 1,
    planDocumentStatus: planSafe.status || 'draft',
    approval: planSafe.approval || { status: 'none' },
    lastPlanUpdate: planSafe.updatedAt || null,
  };

  return {
    kpis,
    goalKpis,
    domainKpis,
    alerts,
    planMeta,
    reviewAlertV2: {
      reviewRequired,
      message: reviewRequired ? 'Review goals and plan effectiveness for this case' : '',
    },
  };
}

module.exports = {
  buildStakeholderAnalyticsBlock,
  DOMAIN_BUCKETS,
};
