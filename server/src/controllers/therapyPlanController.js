const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const mongoose = require('mongoose');
const crypto = require('crypto');
const TherapyPlan = require('../models/TherapyPlan');
const TherapyCase = require('../models/TherapyCase');
const { ChildCase } = require('../models/ChildCase');
const { User } = require('../models/User');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { recordAuditEvent } = require('../utils/auditLog');
const { mergeShortTermGoalsPreservingLockedBaselines } = require('../utils/planBaselineLock');
const { invalidateProgressEngineCache, computeProgressEngineForCase } = require('../services/progressEngine');
const { resolveMasteryRuleFromGoal, PRESET_KEYS } = require('../utils/masteryPresets');
const { THERAPY_STATUS } = require('../constants/workflowEnums');
const { startNewEpisode } = require('../services/therapyEpisodeService');
const { scheduleEmitClinicalEvent, actorFromReq } = require('../services/clinicalEventService');

const THERAPY_DOMAIN_OPTIONS = TherapyPlan.THERAPY_DOMAIN_OPTIONS;
const SHORT_TERM_GOAL_STATUS = TherapyPlan.SHORT_TERM_GOAL_STATUS;

function isValidDomain(d) {
  return THERAPY_DOMAIN_OPTIONS.includes(d);
}

/**
 * Resolve status from body: explicit status wins, else legacy draft boolean.
 * For PATCH, pass existingStatus when client omits status so we do not reset a final plan.
 */
function resolvePlanStatus(body, existingStatus = 'draft') {
  const raw = body?.status;
  if (raw === 'draft' || raw === 'final') return raw;
  if (body?.draft === true) return 'draft';
  if (body?.draft === false) return 'final';
  return existingStatus;
}

function normalizeShortTermGoals(raw) {
  if (!Array.isArray(raw)) return [];
  const MT = TherapyPlan.MEASUREMENT_TYPES || ['rating_1_5'];
  return raw
    .filter((g) => g && String(g.title || '').trim())
    .map((g) => {
      const mp = String(g.masteryPreset || '')
        .trim()
        .toLowerCase();
      return {
        goalId: String(g.goalId || '').trim(),
        goalKey: String(g.goalKey || '').trim() || crypto.randomUUID(),
        title: String(g.title).trim(),
        measurableCriteria: String(g.measurableCriteria || '').trim(),
        masteryCriteria: String(g.masteryCriteria || '').trim(),
        reviewDate: g.reviewDate ? new Date(g.reviewDate) : null,
        status: SHORT_TERM_GOAL_STATUS.includes(g.status) ? g.status : 'Active',
        domain: isValidDomain(g.domain) ? g.domain : 'Speech',
        measurement: {
          type: MT.includes(g.measurement?.type || g.measurementType)
            ? g.measurement?.type || g.measurementType
            : 'rating_1_5',
          unit: String(g.measurement?.unit || '').trim(),
        },
        baseline: {
          value: g.baseline?.value != null && Number.isFinite(Number(g.baseline.value)) ? Number(g.baseline.value) : null,
          date: g.baseline?.date ? new Date(g.baseline.date) : null,
          notes: String(g.baseline?.notes || '').trim(),
        },
        target: {
          value: g.target?.value != null && Number.isFinite(Number(g.target.value)) ? Number(g.target.value) : null,
          notes: String(g.target?.notes || '').trim(),
        },
        masteryPreset: PRESET_KEYS.includes(mp) ? mp : '',
        masteryRule: resolveMasteryRuleFromGoal({ masteryPreset: mp, masteryRule: g.masteryRule }),
      };
    });
}

function normalizeActivities(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && String(a.title || '').trim())
    .map((a) => {
      const row = {
        title: String(a.title).trim(),
        description: String(a.description || '').trim(),
        linkedGoal: String(a.linkedGoal || '').trim(),
      };
      const lid = a.libraryActivityId;
      if (lid && mongoose.Types.ObjectId.isValid(String(lid))) {
        row.libraryActivityId = new mongoose.Types.ObjectId(String(lid));
      }
      return row;
    });
}

function validateShortTermGoalsForFinal(goals) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return { ok: false, message: 'At least one short-term goal is required for submission' };
  }
  for (const g of goals) {
    if (!isValidDomain(g.domain)) {
      return { ok: false, message: `Invalid domain for goal: ${g.domain}` };
    }
    if (!String(g.measurableCriteria || '').trim()) {
      return { ok: false, message: 'Each short-term goal must include measurable criteria' };
    }
    if (g.status && !SHORT_TERM_GOAL_STATUS.includes(g.status)) {
      return { ok: false, message: `Invalid goal status: ${g.status}` };
    }
  }
  return { ok: true };
}

function validateFinalPlan({ domains, longTermGoal, shortTermGoals }) {
  const domainList = Array.isArray(domains) ? domains.filter((d) => THERAPY_DOMAIN_OPTIONS.includes(d)) : [];
  if (domainList.length === 0) {
    return { ok: false, message: 'Select at least one therapy domain' };
  }
  const lt = longTermGoal || {};
  if (!String(lt.title || '').trim()) {
    return { ok: false, message: 'Long-term goal title is required' };
  }
  return validateShortTermGoalsForFinal(shortTermGoals);
}

function applyStatusToDoc(planDoc, status) {
  planDoc.status = status;
  planDoc.draft = status === 'draft';
  const locked = ['approved', 'active', 'archived'].includes(String(planDoc.planStatus || ''));
  if (!locked) {
    planDoc.planStatus = status === 'draft' ? 'draft' : 'final';
  }
}

async function assertActiveTherapyCase(caseId, therapistId) {
  return TherapyCase.findOne({ caseId, therapistId, status: THERAPY_STATUS.ACTIVE }).lean();
}

function childNameFromParentChildren(parent, childId) {
  if (!parent || !Array.isArray(parent.children) || !childId) return 'Child';
  const found = parent.children.find((c) => c && c._id && c._id.toString() === childId.toString());
  if (!found) return 'Child';
  return `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
}

function domainToDisplayLabel(d) {
  if (!d) return '';
  const m = {
    Speech: 'Speech Therapy',
    OT: 'Occupational Therapy',
    Sensory: 'Sensory Therapy',
    Behavioral: 'Behavioral Therapy',
    'Behavioral (ABA)': 'Behavioral Therapy (ABA)',
    AAC: 'AAC',
    PECS: 'PECS',
  };
  return m[d] || String(d);
}

/** Same shape as GET /therapy-plan list items (childName, goalsCount, …). Clinical % comes from progress engine on the case. */
function enrichPlanForList(plan, caseMap, parentMap) {
  const c = caseMap.get(String(plan.caseId));
  let childName = 'Child';
  if (c) {
    const parent = parentMap.get(String(c.parentId));
    childName = childNameFromParentChildren(parent, c.childId);
  }
  const st = Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [];
  const total = st.length;
  const achieved = st.filter((g) => g.status === 'Achieved').length;
  const domains = Array.isArray(plan.domains) ? plan.domains : [];
  const primaryDomainLabel =
    domains.length === 0
      ? 'Therapy plan'
      : domains.length === 1
        ? domainToDisplayLabel(domains[0])
        : `${domainToDisplayLabel(domains[0])} +${domains.length - 1}`;

  return {
    ...plan,
    childName,
    goalsCount: total,
    achievedGoalsCount: achieved,
    domainsPrimaryLabel: primaryDomainLabel,
    domainsDisplay: domains.map(domainToDisplayLabel).filter(Boolean).join(' · '),
  };
}

/**
 * GET /api/therapy-plan
 * All therapy plans for the logged-in therapist (with child name + progress helpers).
 */
exports.listTherapyPlansForTherapist = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const plans = await TherapyPlan.find({ therapistId }).sort({ updatedAt: -1 }).lean();

    if (plans.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: {
          domainOptions: THERAPY_DOMAIN_OPTIONS,
          shortTermStatuses: SHORT_TERM_GOAL_STATUS,
          measurementTypes: TherapyPlan.MEASUREMENT_TYPES,
          masteryRuleTypes: TherapyPlan.MASTERY_RULE_TYPES,
          planApprovalStatuses: TherapyPlan.PLAN_APPROVAL_STATUS,
          planLifecycleStatuses: TherapyPlan.PLAN_LIFECYCLE_STATUSES,
        },
      });
    }

    const caseIds = [...new Set(plans.map((p) => String(p.caseId)))];
    const cases = await ChildCase.find({ _id: { $in: caseIds } }).lean();
    const caseMap = new Map(cases.map((c) => [String(c._id), c]));
    const parentIds = [...new Set(cases.map((c) => String(c.parentId)))];
    const parents = await User.find({ _id: { $in: parentIds } }).select('children').lean();
    const parentMap = new Map(parents.map((p) => [String(p._id), p]));

    const data = plans.map((plan) => enrichPlanForList(plan, caseMap, parentMap));

    return res.status(200).json({
      success: true,
      data,
      meta: {
        domainOptions: THERAPY_DOMAIN_OPTIONS,
        shortTermStatuses: SHORT_TERM_GOAL_STATUS,
        measurementTypes: TherapyPlan.MEASUREMENT_TYPES,
        masteryRuleTypes: TherapyPlan.MASTERY_RULE_TYPES,
        planApprovalStatuses: TherapyPlan.PLAN_APPROVAL_STATUS,
        planLifecycleStatuses: TherapyPlan.PLAN_LIFECYCLE_STATUSES,
      },
    });
  } catch (error) {
    console.error('listTherapyPlansForTherapist:', error);
    return res.status(500).json({ success: false, message: 'Failed to list therapy plans' });
  }
};

/**
 * POST /api/therapy-plan/:id/duplicate
 * Body: { targetCaseId } — copy plan to another case (target must have no plan; active therapy case required).
 */
exports.duplicateTherapyPlan = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;
    const { targetCaseId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }
    if (!mongoose.Types.ObjectId.isValid(targetCaseId)) {
      return res.status(400).json({ success: false, message: 'Invalid targetCaseId' });
    }

    const source = await TherapyPlan.findOne({ _id: id, therapistId });
    if (!source) {
      return res.status(404).json({ success: false, message: 'Therapy plan not found' });
    }

    const existingTarget = await TherapyPlan.findOne({
      caseId: targetCaseId,
      therapistId,
    }).lean();
    if (existingTarget) {
      return res.status(409).json({
        success: false,
        message: 'Target case already has a therapy plan. Edit that plan or pick another case.',
      });
    }

    const active = await assertActiveTherapyCase(targetCaseId, therapistId);
    if (!active) {
      return res.status(403).json({
        success: false,
        message: 'Start therapy for the target case before adding a plan',
      });
    }

    const src = source.toObject();
    delete src._id;
    delete src.__v;
    delete src.createdAt;
    delete src.updatedAt;
    src.caseId = new mongoose.Types.ObjectId(String(targetCaseId));
    src.therapistId = therapistId;
    src.status = 'draft';
    src.draft = true;
    src.planStatus = 'draft';
    src.submittedAt = null;
    src.approvedAt = null;
    src.approvedBy = undefined;
    src.approval = { status: 'none', requestedAt: null, approvedAt: null, approvedBy: undefined, rejectionReason: '' };

    if (Array.isArray(src.shortTermGoals)) {
      src.shortTermGoals = src.shortTermGoals.map((g) => {
        const { _id, ...rest } = g;
        return { ...rest, goalKey: rest.goalKey || crypto.randomUUID() };
      });
    }

    const created = await TherapyPlan.create(src);
    try {
      invalidateProgressEngineCache(targetCaseId);
    } catch (_) {
      /* ignore */
    }
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('duplicateTherapyPlan:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate therapy plan' });
  }
};

/**
 * POST /api/therapy-plan/duplicate
 * Body: { originalPlanId, caseId } — childId is taken from the case document (optional body.childId must match if sent).
 */
exports.duplicateTherapyPlanPost = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { originalPlanId, childId: bodyChildId, caseId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(originalPlanId)) {
      return res.status(400).json({ success: false, message: 'Invalid originalPlanId' });
    }
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    if (!caseDoc.childId || !mongoose.Types.ObjectId.isValid(String(caseDoc.childId))) {
      return res.status(400).json({ success: false, message: 'Case has no valid child' });
    }
    if (bodyChildId != null && String(caseDoc.childId) !== String(bodyChildId)) {
      return res.status(400).json({ success: false, message: 'childId does not match this case' });
    }

    const source = await TherapyPlan.findOne({ _id: originalPlanId, therapistId });
    if (!source) {
      return res.status(404).json({ success: false, message: 'Therapy plan not found' });
    }

    const existingTarget = await TherapyPlan.findOne({ caseId, therapistId }).lean();
    if (existingTarget) {
      return res.status(409).json({
        success: false,
        message: 'Target case already has a therapy plan. Edit that plan or pick another case.',
      });
    }

    const active = await assertActiveTherapyCase(caseId, therapistId);
    if (!active) {
      return res.status(403).json({
        success: false,
        message: 'Start therapy for the target case before adding a plan',
      });
    }

    const src = source.toObject();
    delete src._id;
    delete src.__v;
    delete src.createdAt;
    delete src.updatedAt;
    src.caseId = new mongoose.Types.ObjectId(String(caseId));
    src.therapistId = therapistId;
    src.status = 'draft';
    src.draft = true;
    src.planStatus = 'draft';
    src.submittedAt = null;
    src.approvedAt = null;
    src.approvedBy = undefined;
    src.approval = { status: 'none', requestedAt: null, approvedAt: null, approvedBy: undefined, rejectionReason: '' };

    if (Array.isArray(src.shortTermGoals)) {
      src.shortTermGoals = src.shortTermGoals.map((g) => {
        const { _id, ...rest } = g;
        return { ...rest, goalKey: rest.goalKey || crypto.randomUUID() };
      });
    }

    const created = await TherapyPlan.create(src);
    try {
      invalidateProgressEngineCache(caseId);
    } catch (_) {
      /* ignore */
    }
    const createdObj = created.toObject();

    const parent = await User.findById(caseDoc.parentId).select('children').lean();
    const childName = childNameFromParentChildren(parent, caseDoc.childId);
    const st = Array.isArray(createdObj.shortTermGoals) ? createdObj.shortTermGoals : [];
    const total = st.length;
    const achieved = st.filter((g) => g.status === 'Achieved').length;
    const progress = total === 0 ? 0 : Math.round((achieved / total) * 100);
    const domains = Array.isArray(createdObj.domains) ? createdObj.domains : [];
    const domain = domains.length ? domainToDisplayLabel(domains[0]) : 'Therapy plan';

    return res.status(201).json({
      success: true,
      newPlan: {
        id: String(createdObj._id),
        childName,
        domain,
        goals: st,
        progress,
        updatedAt: createdObj.updatedAt,
      },
    });
  } catch (error) {
    console.error('duplicateTherapyPlanPost:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate therapy plan' });
  }
};

/**
 * POST /api/therapy-plan
 * Body: caseId, status ('draft' | 'final'), domains, longTermGoal, shortTermGoals, activities, goals (legacy)
 */
exports.createTherapyPlan = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const {
      caseId,
      domains = [],
      longTermGoal = {},
      shortTermGoals = [],
      activities = [],
      goals = [],
    } = req.body || {};

    const status = resolvePlanStatus(req.body);

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const active = await assertActiveTherapyCase(caseId, therapistId);
    if (!active) {
      return res.status(403).json({
        success: false,
        message: 'Start therapy for this case before creating a plan',
      });
    }

    const existing = await TherapyPlan.findOne({ caseId, therapistId }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A plan already exists for this case. Use PATCH to update.',
      });
    }

    const domainList = Array.isArray(domains) ? domains.filter((d) => THERAPY_DOMAIN_OPTIONS.includes(d)) : [];
    const normalizedShort = normalizeShortTermGoals(shortTermGoals);
    const normalizedActivities = normalizeActivities(activities);

    if (status === 'final') {
      const v = validateFinalPlan({
        domains: domainList,
        longTermGoal,
        shortTermGoals: normalizedShort,
      });
      if (!v.ok) return res.status(400).json({ success: false, message: v.message });
    }

    const plan = await TherapyPlan.create({
      caseId,
      therapistId,
      domains: domainList,
      longTermGoal: {
        title: String(longTermGoal.title || '').trim(),
        description: String(longTermGoal.description || '').trim(),
        timeline: String(longTermGoal.timeline || '').trim(),
      },
      shortTermGoals: normalizedShort,
      activities: normalizedActivities,
      goals: Array.isArray(goals) ? goals : [],
      status,
      draft: status === 'draft',
      planStatus: status === 'draft' ? 'draft' : 'final',
    });

    try {
      await recordAuditEvent({
        req,
        actorId: therapistId,
        action: 'therapy_plan_created',
        entityType: 'TherapyPlan',
        entityId: plan._id,
        caseId,
        summary: `status=${String(plan.status)} planVersion=${Number(plan.planVersion || 1)}`,
      });
    } catch (e) {
      console.error('audit therapy_plan_created:', e);
    }

    try {
      invalidateProgressEngineCache(caseId);
    } catch (_) {
      /* ignore */
    }

    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('createTherapyPlan:', error);
    return res.status(500).json({ success: false, message: 'Failed to create therapy plan' });
  }
};

/**
 * GET /api/therapy-plan/:caseId
 */
exports.getTherapyPlanByCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const therapistId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const plan = await TherapyPlan.findOne({ caseId, therapistId })
      .sort({ updatedAt: -1 })
      .lean();
    const { attachEffectivePlanStatus } = require('../utils/therapyPlanLifecycle');
    return res.status(200).json({
      success: true,
      data: plan ? attachEffectivePlanStatus(plan) : null,
      meta: {
        domainOptions: THERAPY_DOMAIN_OPTIONS,
        shortTermStatuses: SHORT_TERM_GOAL_STATUS,
        measurementTypes: TherapyPlan.MEASUREMENT_TYPES,
        masteryRuleTypes: TherapyPlan.MASTERY_RULE_TYPES,
        planApprovalStatuses: TherapyPlan.PLAN_APPROVAL_STATUS,
        planLifecycleStatuses: TherapyPlan.PLAN_LIFECYCLE_STATUSES,
      },
    });
  } catch (error) {
    console.error('getTherapyPlanByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch therapy plan' });
  }
};

/**
 * GET /api/therapy-plan/case/:caseId/assign-context
 * Plans on this case + children for the case (parent profile), for Assign Plan modal.
 */
exports.getAssignContext = async (req, res) => {
  try {
    const { caseId } = req.params;
    const therapistId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const active = await assertActiveTherapyCase(caseId, therapistId);
    if (!active) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const plans = await TherapyPlan.find({ caseId, therapistId }).sort({ updatedAt: -1 }).lean();

    const parent = await User.findById(caseDoc.parentId).select('children').lean();
    const children = [];
    if (parent && Array.isArray(parent.children)) {
      for (const c of parent.children) {
        if (!c || !c._id) continue;
        children.push({
          childId: String(c._id),
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          displayName: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Child',
        });
      }
    }
    const caseChildIdStr = String(caseDoc.childId);
    const filtered = children.filter((ch) => String(ch.childId) === caseChildIdStr);
    const childrenForCase =
      filtered.length > 0
        ? filtered
        : [{ childId: caseChildIdStr, firstName: '', lastName: '', displayName: 'Child' }];

    const plansPayload = plans.map((p) => {
      const domains = Array.isArray(p.domains) ? p.domains : [];
      const primary = domains.length ? domainToDisplayLabel(domains[0]) : 'Therapy plan';
      const life = p.status === 'final' || p.draft === false ? 'Active' : 'Draft';
      const label =
        domains.length > 1 ? `${primary} +${domains.length - 1} · ${life}` : `${primary} · ${life}`;
      return {
        _id: String(p._id),
        label,
        status: p.status,
        draft: !!p.draft,
        updatedAt: p.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        caseId: String(caseId),
        caseChildId: caseChildIdStr,
        plans: plansPayload,
        children: childrenForCase,
      },
    });
  } catch (error) {
    console.error('getAssignContext:', error);
    return res.status(500).json({ success: false, message: 'Failed to load assign context' });
  }
};

/**
 * POST /api/therapy-plan/assign
 * Body: { planId, childId, caseId } — optional assignedBy from body is ignored (uses JWT).
 */
exports.assignTherapyPlan = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { planId, childId, caseId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid planId' });
    }
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ success: false, message: 'Invalid childId' });
    }
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const plan = await TherapyPlan.findOne({ _id: planId, therapistId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Therapy plan not found' });
    }
    if (String(plan.caseId) !== String(caseId)) {
      return res.status(400).json({ success: false, message: 'Plan does not belong to this case file' });
    }

    const active = await assertActiveTherapyCase(caseId, therapistId);
    if (!active) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    if (String(caseDoc.childId) !== String(childId)) {
      return res.status(400).json({
        success: false,
        message: 'Selected child does not belong to this case file',
      });
    }

    const assignability = validateFinalPlan({
      domains: Array.isArray(plan.domains) ? plan.domains : [],
      longTermGoal: plan.longTermGoal || {},
      shortTermGoals: Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [],
    });
    if (!assignability.ok) {
      return res.status(400).json({
        success: false,
        message: assignability.message || 'Plan must include valid domains, a long-term goal, and short-term goals before assignment',
      });
    }

    if (plan.assignedChildId && String(plan.assignedChildId) === String(childId)) {
      return res.status(409).json({
        success: false,
        message: 'This plan is already assigned to this child.',
      });
    }

    plan.assignedBy = therapistId;
    plan.assignedChildId = childId;

    applyStatusToDoc(plan, 'final');

    await plan.save();
    try {
      invalidateProgressEngineCache(caseId);
    } catch (_) {
      /* ignore */
    }

    const planLean = await TherapyPlan.findById(plan._id).lean();

    try {
      await recordAuditEvent({
        req,
        actorId: therapistId,
        action: 'therapy_plan_assigned',
        entityType: 'TherapyPlan',
        entityId: plan._id,
        caseId,
        summary: `assignedChildId=${String(childId)}`,
      });
    } catch (e) {
      console.error('audit therapy_plan_assigned:', e);
    }
    const cases = await ChildCase.find({ _id: caseId }).lean();
    const caseMap = new Map(cases.map((c) => [String(c._id), c]));
    const parentIds = [...new Set(cases.map((c) => String(c.parentId)))];
    const parents = await User.find({ _id: { $in: parentIds } }).select('children').lean();
    const parentMap = new Map(parents.map((p) => [String(p._id), p]));
    const enriched = enrichPlanForList(planLean, caseMap, parentMap);
    const st = Array.isArray(planLean.shortTermGoals) ? planLean.shortTermGoals : [];
    const displayActive =
      enriched.assignedChildId != null ||
      enriched.status === 'final' ||
      enriched.draft === false;

    let engineProgressPercent = 0;
    try {
      const pe = await computeProgressEngineForCase(caseId, { therapistId, useCache: false });
      if (pe.success && pe.data?.overallScore != null) {
        engineProgressPercent = Math.round((Number(pe.data.overallScore) / 5) * 100);
      }
    } catch (_) {
      /* ignore */
    }

    return res.status(200).json({
      success: true,
      /** Full list-row shape (matches GET /therapy-plan) for immediate UI merge */
      therapyPlan: {
        ...enriched,
        id: String(planLean._id),
        domain: enriched.domainsPrimaryLabel || 'Therapy plan',
        goals: st,
        progress: engineProgressPercent,
        status: displayActive ? 'Active' : 'Draft',
      },
    });
  } catch (error) {
    console.error('assignTherapyPlan:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign therapy plan' });
  }
};

/**
 * PATCH /api/therapy-plan/:id
 */
exports.updateTherapyPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const {
      domains,
      longTermGoal,
      shortTermGoals,
      activities,
      goals,
      publishRevision,
    } = req.body || {};

    // Retry once for optimistic concurrency conflicts during near-simultaneous updates.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const plan = await TherapyPlan.findOne({ _id: id, therapistId });
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Therapy plan not found' });
      }

      const previousState = {
        planVersion: plan.planVersion,
        domains: JSON.parse(JSON.stringify(plan.domains || [])),
        longTermGoalTitle: plan.longTermGoal?.title || '',
        shortTermGoalsCount: (plan.shortTermGoals || []).length,
        approvalStatus: plan.approval?.status || '',
        planStatus: plan.planStatus,
      };

      const existingStatus =
        plan.status === 'final' || plan.status === 'draft'
          ? plan.status
          : plan.draft
            ? 'draft'
            : 'final';
      const nextStatus = resolvePlanStatus(req.body, existingStatus);
      const mergedDomains =
        domains !== undefined
          ? Array.isArray(domains)
            ? domains.filter((d) => THERAPY_DOMAIN_OPTIONS.includes(d))
            : []
          : plan.domains;
      const mergedLong =
        longTermGoal !== undefined
          ? {
              title: String(longTermGoal.title ?? plan.longTermGoal?.title ?? '').trim(),
              description: String(longTermGoal.description ?? plan.longTermGoal?.description ?? '').trim(),
              timeline: String(longTermGoal.timeline ?? plan.longTermGoal?.timeline ?? '').trim(),
            }
          : plan.longTermGoal || { title: '', description: '', timeline: '' };
      let mergedShort =
        shortTermGoals !== undefined ? normalizeShortTermGoals(shortTermGoals) : plan.shortTermGoals;
      if (shortTermGoals !== undefined && plan.baselineLocked) {
        mergedShort = mergeShortTermGoalsPreservingLockedBaselines(plan, mergedShort);
      }
      const mergedActivities =
        activities !== undefined ? normalizeActivities(activities) : plan.activities;

      if (nextStatus === 'final') {
        const v = validateFinalPlan({
          domains: mergedDomains,
          longTermGoal: mergedLong,
          shortTermGoals: mergedShort,
        });
        if (!v.ok) return res.status(400).json({ success: false, message: v.message });
      }

      if (domains !== undefined) plan.domains = mergedDomains;
      if (longTermGoal !== undefined) plan.longTermGoal = mergedLong;
      if (shortTermGoals !== undefined) plan.shortTermGoals = mergedShort;
      if (activities !== undefined) plan.activities = mergedActivities;
      if (goals !== undefined) {
        plan.goals = Array.isArray(goals) ? goals : [];
      }

      applyStatusToDoc(plan, nextStatus);

      if (publishRevision) {
        plan.planVersion = Number(plan.planVersion || 1) + 1;
        plan.approval = {
          status: 'none',
          requestedAt: null,
          approvedAt: null,
          approvedBy: undefined,
          rejectionReason: '',
        };
      }

      try {
        await plan.save();
        try {
          invalidateProgressEngineCache(plan.caseId);
        } catch (_) {
          /* ignore */
        }

        try {
          await recordAuditEvent({
            req,
            actorId: therapistId,
            action: 'therapy_plan_changed',
            entityType: 'TherapyPlan',
            entityId: plan._id,
            caseId: plan.caseId,
            summary: publishRevision ? `planVersion=${plan.planVersion} published` : 'Therapy plan updated',
          });
        } catch (e) {
          console.error('audit therapy_plan_changed:', e);
        }

        if (publishRevision) {
          await recordAuditEvent({
            req,
            actorId: therapistId,
            action: 'therapy_plan_revision_published',
            entityType: 'TherapyPlan',
            entityId: plan._id,
            caseId: plan.caseId,
            summary: `planVersion=${plan.planVersion}`,
          });
          try {
            await startNewEpisode({
              caseId: plan.caseId,
              therapistId: plan.therapistId,
              planId: plan._id,
              planVersion: plan.planVersion,
            });
          } catch (epErr) {
            console.error('therapy episode on revision:', epErr);
          }
        }

        try {
          const act = actorFromReq(req);
          const newState = {
            planVersion: plan.planVersion,
            domains: JSON.parse(JSON.stringify(plan.domains || [])),
            longTermGoalTitle: plan.longTermGoal?.title || '',
            shortTermGoalsCount: (plan.shortTermGoals || []).length,
            approvalStatus: plan.approval?.status || '',
            planStatus: plan.planStatus,
          };
          scheduleEmitClinicalEvent({
            eventType: 'THERAPY_PLAN_UPDATED',
            caseId: plan.caseId,
            actorRole: act.actorRole,
            actorId: act.actorId,
            linkedModules: ['therapy'],
            payload: { planId: String(plan._id), publishRevision: Boolean(publishRevision) },
            previousState,
            newState,
          });
        } catch (evErr) {
          console.error('clinical event therapy plan update:', evErr);
        }

        return res.status(200).json({ success: true, data: plan.toObject() });
      } catch (saveError) {
        if (saveError?.name === 'VersionError' && attempt === 0) {
          continue;
        }
        throw saveError;
      }
    }

    return res.status(409).json({ success: false, message: 'Plan was updated concurrently. Please retry.' });
  } catch (error) {
    console.error('updateTherapyPlan:', error);
    return res.status(500).json({ success: false, message: 'Failed to update therapy plan' });
  }
};

/**
 * POST /api/therapy-plan/submit-for-approval/:planId
 * Therapist requests clinician (supervisory) sign-off on the plan document.
 */
exports.submitTherapyPlanForApproval = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { planId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid planId' });
    }

    const plan = await TherapyPlan.findOne({ _id: planId, therapistId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Therapy plan not found' });
    }

    const access = await assertTherapistCaseAccess(req, plan.caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const st = String(plan.approval?.status || 'none');
    if (st === 'pending') {
      return res.status(409).json({ success: false, message: 'Plan is already pending approval' });
    }

    const previousApprovalStatus = st;

    const domainList = Array.isArray(plan.domains) ? plan.domains.filter((d) => THERAPY_DOMAIN_OPTIONS.includes(d)) : [];
    const vf = validateFinalPlan({
      domains: domainList,
      longTermGoal: plan.longTermGoal || {},
      shortTermGoals: Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [],
    });
    if (!vf.ok) {
      return res.status(400).json({ success: false, message: vf.message });
    }

    const now = getCurrentTime();
    plan.planStatus = 'final';
    plan.submittedAt = now;
    plan.status = 'final';
    plan.draft = false;
    plan.approval = {
      status: 'pending',
      requestedAt: now,
      approvedAt: null,
      approvedBy: undefined,
      rejectionReason: '',
    };
    await plan.save();
    try {
      invalidateProgressEngineCache(plan.caseId);
    } catch (_) {
      /* ignore */
    }

    await recordAuditEvent({
      req,
      actorId: therapistId,
      action: 'therapy_plan_submit_for_approval',
      entityType: 'TherapyPlan',
      entityId: plan._id,
      caseId: plan.caseId,
      summary: 'Therapy plan submitted for clinician approval',
    });

    try {
      const act = actorFromReq(req);
      scheduleEmitClinicalEvent({
        eventType: 'THERAPY_PLAN_UPDATED',
        caseId: plan.caseId,
        actorRole: act.actorRole,
        actorId: act.actorId,
        linkedModules: ['therapy'],
        payload: { planId: String(plan._id), trigger: 'submit_for_approval' },
        previousState: { approvalStatus: previousApprovalStatus },
        newState: { approvalStatus: String(plan.approval?.status || 'pending') },
      });
    } catch (evErr) {
      console.error('clinical event plan submit:', evErr);
    }

    return res.status(200).json({ success: true, data: plan.toObject() });
  } catch (error) {
    console.error('submitTherapyPlanForApproval:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit plan for approval' });
  }
};

/**
 * POST /api/therapy-plan/:id/approve (clinician only)
 * Validates plan content and records approval; plan becomes session-eligible after therapy start sets `active`.
 */
exports.approveTherapyPlanByClinician = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid plan id' });
    }

    const plan = await TherapyPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Therapy plan not found' });
    }

    const caseDoc = await ChildCase.findById(plan.caseId).lean();
    if (!caseDoc || String(caseDoc.clinicianId) !== String(clinicianId)) {
      return res.status(403).json({ success: false, message: 'Only the assigned clinician can approve this plan' });
    }

    if (String(plan.approval?.status || '') !== 'pending') {
      return res.status(400).json({ success: false, message: 'Plan is not pending clinician approval' });
    }

    const previousApprovalStatus = String(plan.approval?.status || 'pending');

    const domainList = Array.isArray(plan.domains) ? plan.domains.filter((d) => THERAPY_DOMAIN_OPTIONS.includes(d)) : [];
    const vf = validateFinalPlan({
      domains: domainList,
      longTermGoal: plan.longTermGoal || {},
      shortTermGoals: Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [],
    });
    if (!vf.ok) {
      return res.status(400).json({ success: false, message: vf.message });
    }

    await TherapyPlan.updateMany(
      { caseId: plan.caseId, planStatus: 'approved', _id: { $ne: plan._id } },
      { $set: { planStatus: 'archived' } }
    );

    const now = getCurrentTime();
    plan.planStatus = 'approved';
    plan.status = 'final';
    plan.draft = false;
    plan.approvedAt = now;
    plan.approvedBy = clinicianId;
    plan.approval = {
      status: 'approved',
      requestedAt: plan.approval?.requestedAt || plan.submittedAt || now,
      approvedAt: now,
      approvedBy: clinicianId,
      rejectionReason: '',
    };

    await plan.save();

    try {
      await startNewEpisode({
        caseId: plan.caseId,
        therapistId: plan.therapistId,
        planId: plan._id,
        planVersion: plan.planVersion || 1,
      });
    } catch (epErr) {
      console.error('therapy episode on approve:', epErr);
    }

    try {
      invalidateProgressEngineCache(plan.caseId);
    } catch (_) {
      /* ignore */
    }

    try {
      await recordAuditEvent({
        req,
        actorId: clinicianId,
        action: 'therapy_plan_approved',
        entityType: 'TherapyPlan',
        entityId: plan._id,
        caseId: plan.caseId,
        summary: `approvedBy=${String(clinicianId)}`,
      });
    } catch (e) {
      console.error('audit therapy_plan_approved:', e);
    }

    try {
      const act = actorFromReq(req);
      scheduleEmitClinicalEvent({
        eventType: 'THERAPY_PLAN_UPDATED',
        caseId: plan.caseId,
        actorRole: act.actorRole,
        actorId: act.actorId,
        linkedModules: ['therapy'],
        payload: { planId: String(plan._id), trigger: 'clinician_approved' },
        previousState: { approvalStatus: previousApprovalStatus },
        newState: { approvalStatus: 'approved', approvedBy: String(clinicianId) },
      });
    } catch (evErr) {
      console.error('clinical event plan approve:', evErr);
    }

    return res.status(200).json({ success: true, data: plan.toObject() });
  } catch (error) {
    console.error('approveTherapyPlanByClinician:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve therapy plan' });
  }
};
