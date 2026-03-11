const Submission = require("../models/Submission");
const { User } = require("../models/User");

/**
 * GET /api/parent/screenings
 * Fetch all screening records for the logged-in parent's children.
 */
exports.getParentScreenings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.children || user.children.length === 0) {
      return res.status(200).json({
        success: true,
        screenings: [],
      });
    }

    const childIds = user.children.map((child) => child._id);
    const submissions = await Submission.find({ childId: { $in: childIds } })
      .sort({ createdAt: -1 })
      .lean();

    const screenings = submissions.map((sub) => {
      const child = user.children.find(
        (c) => c._id.toString() === sub.childId.toString()
      );
      const childName = child
        ? `${child.firstName || ""} ${child.lastName || ""}`.trim() || "Child"
        : "Child";
      return {
        _id: sub._id,
        childName,
        screeningType: sub.questionnaireType || "Screening",
        date: sub.createdAt,
        status: "Completed",
        result: sub.result,
        resultDescription: sub.resultDescription,
        scores: sub.scores,
      };
    });

    res.status(200).json({
      success: true,
      screenings,
    });
  } catch (error) {
    console.error("Error fetching parent screenings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch screenings",
    });
  }
};
