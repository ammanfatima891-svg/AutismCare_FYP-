const { ClinicalEvent } = require('../models/ClinicalEvent');
const { ChildCase } = require('../models/ChildCase');
const { computeProgressEngineForCase } = require('../services/progressEngine');
const { buildCrossDomainInsights, getLabContextForCase } = require('../services/clinicalCorrelationService');

/**
 * Admin-only aggregated intelligence (best-effort; bounded work per request).
 */
exports.getGlobalClinicalSummary = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [eventCounts, casesSample, progressEventsInWindow] = await Promise.all([
      ClinicalEvent.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$eventType', c: { $sum: 1 } } },
      ]),
      ChildCase.find({})
        .sort({ updatedAt: -1 })
        .limit(40)
        .select('_id status')
        .lean(),
      ClinicalEvent.countDocuments({
        eventType: 'PROGRESS_UPDATED',
        timestamp: { $gte: since },
      }),
    ]);

    const byType = {};
    for (const row of eventCounts) {
      byType[row._id] = row.c;
    }

    let improving = 0;
    let declining = 0;
    let labCorrelationHints = 0;
    const domainEffectiveness = { communication: [], behavior: [], social: [] };

    for (const c of casesSample) {
      const id = c._id;
      try {
        const r = await computeProgressEngineForCase(String(id), { useCache: true });
        if (!r.success || !r.data) continue;
        const ir = Number(r.data.improvementRate || 0);
        if (ir > 0.02) improving += 1;
        if (ir < -0.02) declining += 1;
        const labCtx = await getLabContextForCase(id);
        const insights = buildCrossDomainInsights(r.data, labCtx);
        if (insights.length) labCorrelationHints += 1;
        for (const d of r.data.domains || []) {
          const name = String(d.name || '').toLowerCase();
          if (domainEffectiveness[name] && typeof d.score === 'number') {
            domainEffectiveness[name].push(d.score);
          }
        }
      } catch (_) {
        /* skip case */
      }
    }

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const therapyEffectivenessByDomain = {
      communication: avg(domainEffectiveness.communication),
      behavior: avg(domainEffectiveness.behavior),
      social: avg(domainEffectiveness.social),
    };

    const denom = casesSample.length || 1;
    return res.status(200).json({
      success: true,
      data: {
        windowDays: 30,
        clinicalEventVolumeByType: byType,
        sampledCases: casesSample.length,
        improvementRateAcrossSample: {
          improvingPct: Math.round((improving / denom) * 100),
          decliningPct: Math.round((declining / denom) * 100),
        },
        progressUpdatedEventsInWindow: progressEventsInWindow,
        labCorrelationCasesWithHints: labCorrelationHints,
        therapyEffectivenessByDomain,
      },
    });
  } catch (e) {
    console.error('getGlobalClinicalSummary:', e);
    return res.status(500).json({ success: false, message: 'Failed to build global clinical summary' });
  }
};
