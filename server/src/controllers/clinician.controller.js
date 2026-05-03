const { getCurrentTime, getAgeYearsFromDob } = require('../utils/time.js');
const Submission = require("../models/Submission");
const TherapyPlan = require("../models/TherapyPlan");
const { ChildCase } = require("../models/ChildCase");
const { User, ROLES } = require("../models/User");
const mongoose = require("mongoose");
const { recordAuditEvent } = require("../utils/auditLog");
const { invalidateProgressEngineCache } = require("../services/progressEngine");
const { SCREENING_STATUS } = require("../constants/workflowEnums");

function toApiScreeningReviewStatus(canonStatus) {
  const v = String(canonStatus || "").trim().toUpperCase();
  if (v === SCREENING_STATUS.SUBMITTED) return "submitted";
  // UI/tests expect "needs_attention" rather than internal "FLAGGED"
  if (v === SCREENING_STATUS.FLAGGED) return "needs_attention";
  if (v === SCREENING_STATUS.REVIEWED) return "reviewed";
  return String(canonStatus || "");
}

/**
 * GET /api/clinician/screening-reviews
 * Return all screening submissions enriched with parent + child info
 * for clinician dashboards.
 */
exports.getScreeningReviewsForClinician = async (req, res) => {
  try {
    // Safety: align with restrictTo (normalized role string)
    const userRole = String(req.user?.role ?? req.jwtRole ?? "").trim().toLowerCase();
    if (!req.user || userRole !== ROLES.CLINICIAN) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const submissions = await Submission.find().sort({ createdAt: -1 }).lean();

    const rawChildIds = submissions
      .map((s) => s.childId)
      .filter(Boolean)
      .map((id) => String(id));
    const uniqueChildIds = [...new Set(rawChildIds)];

    let parents = [];
    if (uniqueChildIds.length > 0) {
      const oidList = uniqueChildIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      parents = await User.find({
        role: ROLES.PARENT,
        "children._id": { $in: oidList },
      })
        .select("firstName lastName email children")
        .lean();
    }

    // childId -> { parent, child } (embedded children on parent User)
    const childLookup = new Map();
    parents.forEach((parent) => {
      (parent.children || []).forEach((child) => {
        if (child && child._id) {
          childLookup.set(String(child._id), { parent, child });
        }
      });
    });

    // Submissions whose childId did not match the first query (e.g. large parent lists split across docs) —
    // resolve parent/child via ChildCase (unique parentId + childId per case).
    const missingChildIds = uniqueChildIds.filter((id) => id && !childLookup.has(id));
    if (missingChildIds.length) {
      const oidMissing = missingChildIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (oidMissing.length) {
        const cases = await ChildCase.find({ childId: { $in: oidMissing } })
          .select('childId parentId')
          .lean();
        const parentIds = [...new Set(cases.map((c) => String(c.parentId)).filter(Boolean))];
        const oidParents = parentIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        if (oidParents.length) {
          const parentsExtra = await User.find({ _id: { $in: oidParents } })
            .select('firstName lastName email children')
            .lean();
          const pmap = new Map(parentsExtra.map((p) => [String(p._id), p]));
          for (const row of cases) {
            const cid = String(row.childId);
            if (!cid || childLookup.has(cid)) continue;
            const p = pmap.get(String(row.parentId));
            if (!p) continue;
            const ch = (p.children || []).find((c) => String(c._id) === cid);
            if (ch) childLookup.set(cid, { parent: p, child: ch });
          }
        }
      }
    }

    const reviews = submissions.map((sub) => {
      const cid = sub.childId != null ? String(sub.childId) : "";
      const link = cid ? childLookup.get(cid) : null;
      const parent = link ? link.parent : null;
      const child = link ? link.child : null;

      const parentName = parent
        ? `${parent.firstName || ""} ${parent.lastName || ""}`.trim() || "Parent"
        : "Parent";
      const parentEmail = parent && typeof parent.email === "string" ? parent.email : "";

      const childName = (() => {
        if (!child) return "Child";
        if (typeof child.name === "string" && child.name.trim()) return child.name.trim();
        const full = `${child.firstName || ""} ${child.lastName || ""}`.trim();
        return full || "Child";
      })();

      // Age from embedded child DOB, else screening submission DOB (parent flow stores it on Submission)
      let childAgeYears = null;
      const dobSource =
        child && child.dateOfBirth
          ? child.dateOfBirth
          : sub.dob || null;
      if (dobSource) {
        childAgeYears = getAgeYearsFromDob(dobSource);
      }

      const totalScore =
        sub.scores && typeof sub.scores.totalScore === "number"
          ? sub.scores.totalScore
          : null;

      // riskLevel is stored when submissions are created (see calculateScreening)
      const riskLevel = sub.riskLevel || "unknown";

      // Canonical screening review lifecycle (system-wide rule)
      // SUBMITTED -> FLAGGED (if elevated risk) -> REVIEWED (if clinician recorded decision)
      let status = SCREENING_STATUS.SUBMITTED;
      if (riskLevel === "medium" || riskLevel === "high") status = SCREENING_STATUS.FLAGGED;
      if (sub.clinicianDecision && sub.clinicianDecision.decision) status = SCREENING_STATUS.REVIEWED;

      return {
        id: sub._id,
        parent: {
          id: parent ? parent._id : null,
          name: parentName,
          email: parentEmail,
        },
        child: {
          id: child ? child._id : null,
          name: childName,
          ageYears: childAgeYears,
        },
        questionnaireType: sub.questionnaireType,
        score: totalScore,
        result: sub.result,
        riskLevel,
        status: toApiScreeningReviewStatus(status),
        clinicianDecision: sub.clinicianDecision || null,
        createdAt: sub.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error("Error fetching clinician screening reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch screening reviews",
    });
  }
};

/**
 * PATCH /api/clinician/screening-reviews/:submissionId/decision
 * Body: { decision: 'clear' | 'monitor' | 'refer', notes?: string }
 */
exports.recordScreeningDecision = async (req, res) => {
  try {
    const userRole = String(req.user?.role ?? req.jwtRole ?? "").trim().toLowerCase();
    if (!req.user || userRole !== ROLES.CLINICIAN) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { submissionId } = req.params;
    const { decision, notes } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ success: false, message: "Invalid submission id" });
    }

    const allowed = ["clear", "monitor", "refer"];
    if (!allowed.includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be one of clear, monitor, refer" });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    submission.clinicianDecision = {
      decision,
      notes: typeof notes === "string" ? notes.trim() : "",
      decidedBy: req.user._id,
      decidedAt: getCurrentTime(),
    };

    await submission.save();

    return res.status(200).json({
      success: true,
      data: {
        id: submission._id,
        clinicianDecision: submission.clinicianDecision,
      },
    });
  } catch (error) {
    console.error("Error recording clinician screening decision:", error);
    return res.status(500).json({ success: false, message: "Failed to record decision" });
  }
};

/**
 * PATCH /api/clinician/therapy-plans/:planId/approve
 * Clinician approves a therapy plan pending review (supervisory / compliance workflow).
 */
exports.approveTherapyPlan = async (req, res) => {
  try {
    const userRole = String(req.user?.role ?? req.jwtRole ?? "").trim().toLowerCase();
    if (!req.user || userRole !== ROLES.CLINICIAN) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { planId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Invalid plan id" });
    }

    const plan = await TherapyPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Therapy plan not found" });
    }

    const caseDoc = await ChildCase.findOne({ _id: plan.caseId, clinicianId: req.user._id }).lean();
    if (!caseDoc) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (String(plan.approval?.status || "") !== "pending") {
      return res.status(400).json({ success: false, message: "Plan is not pending approval" });
    }

    plan.approval.status = "approved";
    plan.approval.approvedAt = getCurrentTime();
    plan.approval.approvedBy = req.user._id;
    plan.approval.rejectionReason = "";
    await plan.save();
    try {
      invalidateProgressEngineCache(plan.caseId);
    } catch (_) {
      /* ignore */
    }

    await recordAuditEvent({
      req,
      actorId: req.user._id,
      action: "therapy_plan_approved",
      entityType: "TherapyPlan",
      entityId: plan._id,
      caseId: plan.caseId,
      summary: "Clinician approved therapy plan",
    });

    return res.status(200).json({ success: true, data: plan.toObject() });
  } catch (error) {
    console.error("approveTherapyPlan:", error);
    return res.status(500).json({ success: false, message: "Failed to approve therapy plan" });
  }
};