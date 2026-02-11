const Questionnaire = require("../models/Questionnaire");
const Submission = require("../models/Submission");
const { User } = require("../models/User");
const { scoreMCHATFromDB } = require("../utils/MchatScoring");
const { scoreASQ } = require("../utils/ASQscoring");
const { getASQCutoff } = require("../utils/asqCutoffs");
const { getASQInterval } = require("../utils/ASQinterval");

// Calculate screening
exports.calculateScreening = async (req, res) => {
  try {
    const { childId, questionnaireType, responses, dob, weeksPreterm, intervalMonths } = req.body;
    const userId = req.user.id;
    console.log('calculateScreening called with:', { childId, questionnaireType, responses: responses.length, dob, weeksPreterm, intervalMonths });

    let scores = {};
    let result = "";
    let resultDescription = "";
    let riskLevel = "";

    if (questionnaireType === "MCHAT-R") {
      const questionnaire = await Questionnaire.findOne({ name: "MCHAT-R" });
      console.log('Questionnaire found:', questionnaire ? 'Yes' : 'No');
      if (!questionnaire) {
        throw new Error('MCHAT-R questionnaire not found in database');
      }
      scores = scoreMCHATFromDB(questionnaire, responses);
      console.log('Scores calculated:', scores);
      result = scores.result;
      resultDescription = scores.resultDescription;
      riskLevel = scores.result === "Pass" ? "low" : scores.result === "Monitor" ? "medium" : "high";
    } else if (questionnaireType === "ASQ-3") {
      const questionnaire = await Questionnaire.findOne({ name: "ASQ-3" });
      scores = scoreASQ(questionnaire.questions, responses, intervalMonths);
      result = scores.resultLabel;
      resultDescription = scores.resultDescription;
      // Include domainStatuses in scores for ASQ-3
      scores.domainStatuses = scores.domainStatuses;
      riskLevel = scores.resultLabel === "Pass" ? "low" : scores.resultLabel === "Monitor" ? "medium" : "high";
    }

    const submission = new Submission({
      childId,
      questionnaireType,
      dob,
      weeksPreterm,
      intervalMonths,
      responses,
      scores,
      result,
      resultDescription,
      riskLevel,
    });

    await submission.save();

    res.status(201).json({
      success: true,
      data: {
        submissionId: submission._id,
        createdAt: submission.createdAt,
        scores,
        result,
        resultDescription,
        riskLevel,
      },
    });
  } catch (error) {
    console.error("Error calculating screening:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate screening",
    });
  }
};

// Get questionnaire by type
exports.getQuestionnaireByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { dob } = req.query;

    let query = { name: type };

    if (dob && type === "ASQ-3") {
      const ageDays = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24));
      query.minAgeDays = { $lte: ageDays };
      query.maxAgeDays = { $gte: ageDays };
    }

    const questionnaire = await Questionnaire.findOne(query);

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: "Questionnaire not found",
      });
    }

    res.status(200).json({
      success: true,
      data: questionnaire,
    });
  } catch (error) {
    console.error("Error fetching questionnaire:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questionnaire",
    });
  }
};

// Get available questionnaires
exports.getAvailableQuestionnaires = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("children");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const availableQuestionnaires = [];

    // For each child, check available questionnaires based on age
    for (const child of user.children) {
      const ageDays = Math.floor((Date.now() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24));

      // MCHAT-R available for 16-30 months
      if (ageDays >= 480 && ageDays <= 900) {
        availableQuestionnaires.push({
          type: "MCHAT-R",
          childId: child._id,
          childName: child.name,
        });
      }

      // ASQ-3 intervals
      const asqIntervals = [2, 6, 12, 18, 24, 30, 36, 48, 60];
      for (const interval of asqIntervals) {
        const minDays = interval * 30 - 15;
        const maxDays = interval * 30 + 15;
        if (ageDays >= minDays && ageDays <= maxDays) {
          availableQuestionnaires.push({
            type: "ASQ-3",
            intervalMonths: interval,
            childId: child._id,
            childName: child.name,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: availableQuestionnaires,
    });
  } catch (error) {
    console.error("Error fetching available questionnaires:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available questionnaires",
    });
  }
};

// Get screening history
exports.getScreeningHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("children");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const childIds = user.children.map(child => child._id);

    const submissions = await Submission.find({ childId: { $in: childIds } })
      .populate("childId", "name dob")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    console.error("Error fetching screening history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch screening history",
    });
  }
};

// Get submission by ID
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch submission",
    });
  }
};

// Get child screening status
exports.getChildScreeningStatus = async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.id;

    // Verify the child belongs to the user
    const user = await User.findById(userId).populate("children");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const child = user.children.find(c => c._id.toString() === childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found",
      });
    }

    // Get all submissions for this child
    const submissions = await Submission.find({ childId })
      .sort({ createdAt: -1 });

    // Calculate screening statistics
    const totalScreenings = submissions.length;
    const latestSubmission = submissions[0];

    // Determine overall screening status
    let overallStatus = "Not Screened";
    let latestRiskLevel = "unknown";

    if (latestSubmission) {
      latestRiskLevel = latestSubmission.riskLevel || "unknown";
      if (latestRiskLevel === "low") {
        overallStatus = "Low Risk";
      } else if (latestRiskLevel === "medium") {
        overallStatus = "Monitor";
      } else if (latestRiskLevel === "high") {
        overallStatus = "High Risk";
      }
    }

    // Group screenings by type
    const screeningsByType = {};
    submissions.forEach(submission => {
      const type = submission.questionnaireType;
      if (!screeningsByType[type]) {
        screeningsByType[type] = [];
      }
      screeningsByType[type].push({
        id: submission._id,
        date: submission.createdAt,
        result: submission.result,
        resultDescription: submission.resultDescription,
        riskLevel: submission.riskLevel,
        scores: submission.scores
      });
    });

    res.status(200).json({
      success: true,
      data: {
        childId,
        childName: `${child.firstName} ${child.lastName}`,
        totalScreenings,
        overallStatus,
        latestRiskLevel,
        latestScreeningDate: latestSubmission ? latestSubmission.createdAt : null,
        screeningsByType
      },
    });
  } catch (error) {
    console.error("Error fetching child screening status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch child screening status",
    });
  }
};

// Get child screenings count
exports.getChildScreeningsCount = async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.id;

    // Verify the child belongs to the user
    const user = await User.findById(userId).populate("children");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const child = user.children.find(c => c._id.toString() === childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found",
      });
    }

    // Get count of screenings for this child
    const screeningsCount = await Submission.countDocuments({ childId });

    res.status(200).json({
      success: true,
      data: {
        childId,
        screeningsCount
      },
    });
  } catch (error) {
    console.error("Error fetching child screenings count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch child screenings count",
    });
  }
};

// Get child screenings
exports.getChildScreenings = async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.id;

    // Verify the child belongs to the user
    const user = await User.findById(userId).populate("children");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const child = user.children.find(c => c._id.toString() === childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found",
      });
    }

    // Get all screenings for this child
    const screenings = await Submission.find({ childId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        childId,
        screenings
      },
    });
  } catch (error) {
    console.error("Error fetching child screenings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch child screenings",
    });
  }
};

// Get screening stats for dashboard
exports.getScreeningStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("children");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const childIds = user.children ? user.children.map(child => child._id) : [];

    // Get total screenings for this user
    const totalScreenings = await Submission.countDocuments({ childId: { $in: childIds } });

    // Get screenings completed this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = await Submission.countDocuments({
      childId: { $in: childIds },
      createdAt: { $gte: startOfMonth }
    });

    res.status(200).json({
      success: true,
      data: {
        totalScreenings,
        thisMonth
      },
    });
  } catch (error) {
    console.error("Error fetching screening stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch screening stats",
    });
  }
};

// Download submission report as PDF
exports.downloadSubmissionReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get submission with child details
    const submission = await Submission.findById(id).populate('childId', 'firstName lastName dateOfBirth');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Verify the submission belongs to the user
    const user = await User.findById(userId).populate("children");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const child = user.children.find(c => c._id.toString() === submission.childId._id.toString());
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found",
      });
    }

    // Generate PDF report
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="screening-report-${submission.childId.firstName}-${submission.childId.lastName}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('ASD Screening Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Child Name: ${submission.childId.firstName} ${submission.childId.lastName}`);
    doc.text(`Date of Birth: ${new Date(submission.childId.dateOfBirth).toLocaleDateString()}`);
    doc.text(`Screening Date: ${new Date(submission.createdAt).toLocaleDateString()}`);
    doc.text(`Questionnaire Type: ${submission.questionnaireType}`);
    doc.moveDown();

    doc.fontSize(16).text('Results:', { underline: true });
    doc.fontSize(12).text(`Result: ${submission.result}`);
    doc.text(`Description: ${submission.resultDescription}`);
    doc.text(`Risk Level: ${submission.riskLevel}`);
    doc.moveDown();

    if (submission.scores && submission.scores.totalScore !== undefined) {
      doc.fontSize(16).text('Scores:', { underline: true });
      doc.fontSize(12).text(`Total Score: ${submission.scores.totalScore}`);

      if (submission.scores.domainScores) {
        doc.text('Domain Scores:');
        Object.entries(submission.scores.domainScores).forEach(([domain, score]) => {
          doc.text(`  ${domain}: ${score}`);
        });
      }

      if (submission.scores.domainStatuses) {
        doc.text('Domain Statuses:');
        Object.entries(submission.scores.domainStatuses).forEach(([domain, status]) => {
          doc.text(`  ${domain}: ${status}`);
        });
      }
    }

    doc.moveDown();
    doc.fontSize(10).text('Generated by ASD Management System', { align: 'center' });

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error("Error downloading submission report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download submission report",
    });
  }
};

// Get available clinicians and therapists for appointments
exports.getAvailableCliniciansAndTherapists = async (req, res) => {
  try {
    const { User } = require("../models/User");

    // Get approved clinicians
    const clinicians = await User.find({
      role: 'clinician',
      approvalStatus: 'active'
    }).select('firstName lastName specialization email phoneNumber');

    // Get approved therapists
    const therapists = await User.find({
      role: 'therapist',
      approvalStatus: 'active'
    }).select('firstName lastName specialization email phoneNumber');

    console.log('Clinicians found:', clinicians.length);
    console.log('Therapists found:', therapists.length);

    res.status(200).json({
      success: true,
      data: {
        clinicians,
        therapists
      },
    });
  } catch (error) {
    console.error("Error fetching clinicians and therapists:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch clinicians and therapists",
    });
  }
};
