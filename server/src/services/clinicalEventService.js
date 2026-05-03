const mongoose = require('mongoose');
const { ClinicalEvent, CLINICAL_EVENT_TYPES } = require('../models/ClinicalEvent');
const { ChildCase } = require('../models/ChildCase');
const { computeProgressEngineForCase } = require('./progressEngine');

function scheduleEmitClinicalEvent(doc) {
  setImmediate(() => {
    emitClinicalEvent(doc).catch((e) => console.error('[ClinicalEvent] emit failed:', e?.message || e));
  });
}

/**
 * @param {object} doc
 * @param {string} doc.eventType
 * @param {mongoose.Types.ObjectId|string} doc.caseId
 * @param {string} doc.actorRole
 * @param {mongoose.Types.ObjectId|string|null} [doc.actorId]
 * @param {object} [doc.payload]
 * @param {string[]} [doc.linkedModules]
 * @param {object} [doc.previousState]
 * @param {object} [doc.newState]
 * @param {string[]} [doc.crossDomainInsight]
 * @param {object} [doc.recommendationAudit]
 * @param {object} [doc.progressEngineSnapshot]
 */
async function emitClinicalEvent(doc) {
  if (!doc || !doc.eventType || !doc.caseId) return null;
  if (!CLINICAL_EVENT_TYPES.includes(doc.eventType)) {
    console.warn('[ClinicalEvent] unknown eventType', doc.eventType);
  }
  const row = {
    eventType: doc.eventType,
    caseId: doc.caseId,
    actorRole: String(doc.actorRole || 'system').toLowerCase(),
    actorId: doc.actorId || null,
    timestamp: doc.timestamp || new Date(),
    payload: doc.payload && typeof doc.payload === 'object' ? doc.payload : {},
    linkedModules: Array.isArray(doc.linkedModules) ? doc.linkedModules : [],
    previousState: doc.previousState,
    newState: doc.newState,
    crossDomainInsight: Array.isArray(doc.crossDomainInsight) ? doc.crossDomainInsight : [],
    recommendationAudit: doc.recommendationAudit && typeof doc.recommendationAudit === 'object' ? doc.recommendationAudit : undefined,
    progressEngineSnapshot: doc.progressEngineSnapshot,
  };
  return ClinicalEvent.create(row);
}

function actorFromReq(req) {
  const u = req.user;
  if (!u) return { actorId: null, actorRole: 'system' };
  return {
    actorId: u._id,
    actorRole: String(u.role || req.jwtRole || '').toLowerCase() || 'unknown',
  };
}

function slimProgressSnapshot(engineData) {
  if (!engineData || typeof engineData !== 'object') return null;
  return {
    engineVersion: engineData.engineVersion,
    overallScore: engineData.overallScore,
    overallTrend: engineData.overallTrend,
    shortTermTrend: engineData.shortTermTrend,
    overallClinicalStatus: engineData.overallClinicalStatus,
    clinicalRecommendation: engineData.clinicalRecommendation
      ? String(engineData.clinicalRecommendation).slice(0, 500)
      : '',
    improvementRate: engineData.improvementRate,
    alertCount: Array.isArray(engineData.smartAlerts) ? engineData.smartAlerts.length : 0,
    topAlerts: (engineData.smartAlerts || []).slice(0, 3).map((a) => ({
      severity: a.severity,
      message: a.message ? String(a.message).slice(0, 200) : '',
      code: a.code,
    })),
  };
}

async function resolveCaseIdFromParentChild(parentId, childId) {
  if (!parentId || !childId) return null;
  if (!mongoose.Types.ObjectId.isValid(String(parentId)) || !mongoose.Types.ObjectId.isValid(String(childId))) {
    return null;
  }
  const c = await ChildCase.findOne({ parentId, childId }).select('_id').lean();
  return c ? String(c._id) : null;
}

/** Resolve ChildCase from appointment parent+child and emit APPOINTMENT_UPDATED (best-effort). */
function scheduleAppointmentClinicalEvent(req, appointment, action, extraPayload = {}) {
  if (!appointment?.parent || !appointment?.child) return;
  setImmediate(() => {
    (async () => {
      try {
        const caseIdStr = await resolveCaseIdFromParentChild(appointment.parent, appointment.child);
        if (!caseIdStr) return;
        const act = actorFromReq(req);
        await emitClinicalEvent({
          eventType: 'APPOINTMENT_UPDATED',
          caseId: caseIdStr,
          actorRole: act.actorRole,
          actorId: act.actorId,
          linkedModules: ['appointments'],
          payload: {
            appointmentId: String(appointment._id),
            action,
            status: appointment.status,
            appointmentType: appointment.appointmentType,
            ...(extraPayload && typeof extraPayload === 'object' ? extraPayload : {}),
          },
        });
      } catch (e) {
        console.error('[ClinicalEvent] appointment:', e?.message || e);
      }
    })();
  });
}

/**
 * Ordered events + grouped by ISO date + optional engine enrichment on PROGRESS_UPDATED rows.
 */
async function buildCaseTimeline(caseId) {
  if (!mongoose.Types.ObjectId.isValid(String(caseId))) {
    return { events: [], groupedByDate: {}, meta: { invalidCaseId: true } };
  }

  const events = await ClinicalEvent.find({ caseId })
    .sort({ timestamp: -1 })
    .lean();

  const groupedByDate = {};
  for (const ev of events) {
    const d = new Date(ev.timestamp).toISOString().slice(0, 10);
    if (!groupedByDate[d]) groupedByDate[d] = [];
    let enriched = { ...ev };

    if (ev.eventType === 'PROGRESS_UPDATED' && !ev.progressEngineSnapshot) {
      try {
        const r = await computeProgressEngineForCase(caseId, { useCache: true });
        if (r.success && r.data) {
          enriched = {
            ...enriched,
            progressEngineSnapshotResolved: slimProgressSnapshot(r.data),
          };
        }
      } catch (_) {
        /* optional enrichment */
      }
    } else if (ev.progressEngineSnapshot) {
      enriched.progressEngineSnapshotResolved = ev.progressEngineSnapshot;
    }

    groupedByDate[d].push(enriched);
  }

  const dateKeys = Object.keys(groupedByDate).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const groupedOrdered = dateKeys.map((date) => ({
    date,
    events: groupedByDate[date],
  }));

  return {
    events,
    groupedByDate: groupedOrdered,
    meta: { count: events.length, caseId: String(caseId) },
  };
}

module.exports = {
  CLINICAL_EVENT_TYPES,
  emitClinicalEvent,
  scheduleEmitClinicalEvent,
  actorFromReq,
  slimProgressSnapshot,
  resolveCaseIdFromParentChild,
  scheduleAppointmentClinicalEvent,
  buildCaseTimeline,
};
