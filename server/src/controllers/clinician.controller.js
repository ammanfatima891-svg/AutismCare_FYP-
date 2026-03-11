const Submission = require("../models/Submission");
const { User, ROLES } = require("../models/User");

/**
 * GET /api/clinician/screening-reviews
 * Return all screening submissions enriched with parent + child info
 * for clinician dashboards.
 */
exports.getScreeningReviewsForClinician = async (req, res) => {
  try {
    // Safety: this route is also protected by restrictTo('clinician') middleware
    if (!req.user || req.user.role !== ROLES.CLINICIAN) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Load all parents with their children (embedded subdocuments)
    const parents = await User.find({ role: ROLES.PARENT }).select(
      "firstName lastName email children"
    );

    // Build a quick lookup from childId -> { parent, child }
    const childLookup = new Map();
    parents.forEach((parent) => {
      (parent.children || []).forEach((child) => {
        if (child && child._id) {
          childLookup.set(child._id.toString(), { parent, child });
        }
      });
    });

    const submissions = await Submission.find().sort({ createdAt: -1 }).lean();

    const reviews = submissions.map((sub) => {
      const link = sub.childId ? childLookup.get(sub.childId.toString()) : null;
      const parent = link ? link.parent : null;
      const child = link ? link.child : null;

      const parentName = parent
        ? `${parent.firstName || ""} ${parent.lastName || ""}`.trim() || "Parent"
        : "Parent";
      const parentEmail = parent ? parent.email : "";

      const childName = child
        ? `${child.firstName || ""} ${child.lastName || ""}`.trim() || "Child"
        : "Child";

      // Age in years (approx) based on dateOfBirth
      let childAgeYears = null;
      if (child && child.dateOfBirth) {
        const dob = new Date(child.dateOfBirth);
        const ageMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageMs);
        childAgeYears = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      const totalScore =
        sub.scores && typeof sub.scores.totalScore === "number"
          ? sub.scores.totalScore
          : null;

      // riskLevel is stored when submissions are created (see calculateScreening)
      const riskLevel = sub.riskLevel || "unknown";

      // Map risk level to a simple status for tabs
      let status = "reviewed";
      if (riskLevel === "medium" || riskLevel === "high") {
        status = "needs_attention";
      }

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
        status,
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

