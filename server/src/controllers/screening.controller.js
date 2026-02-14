const Questionnaire = require("../models/Questionnaire");
const Submission = require("../models/Submission");
const { User } = require("../models/User");
const { scoreMCHATFromDB } = require("../utils/MchatScoring");
const { scoreASQ } = require("../utils/ASQscoring");
const { getASQCutoff } = require("../utils/asqCutoffs");
const { getASQInterval } = require("../utils/ASQinterval");
const sendEmailWithAttachments = require("../utils/email").sendEmailWithAttachments;

// Build PDF buffer for a submission (for email or download)
function buildSubmissionPdfBuffer(submission, child) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const riskLevel = submission.result === "Pass" ? "low" : submission.result === "Monitor" ? "medium" : "high";
    const firstName = (child && child.firstName) || "Child";
    const lastName = (child && child.lastName) || "";
    const dateOfBirth = child && child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : "—";

    doc.fontSize(22).fillColor("teal").text("AutismCare", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("gray").text("ASD Management Platform · Screening Report", { align: "center" });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor("#ddd").stroke();
    doc.moveDown(1.5);
    doc.fillColor("black");

    doc.fontSize(18).text(`${submission.questionnaireType} Screening Report`);
    doc.moveDown(1);
    doc.fontSize(12).text(`Child: ${firstName} ${lastName}`);
    doc.text(`Date of birth: ${dateOfBirth}`);
    doc.text(`Screening date: ${new Date(submission.createdAt).toLocaleDateString()}`);
    doc.moveDown(1);

    doc.fontSize(14).text("Results");
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Result: ${submission.result}`);
    doc.text(`Risk level: ${riskLevel}`);
    if (submission.resultDescription) {
      doc.moveDown(0.5);
      doc.text(submission.resultDescription, { width: 500, align: "left" });
    }
    doc.moveDown(1);

    if (submission.scores && submission.scores.totalScore !== undefined) {
      doc.fontSize(14).text("Scores");
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Total score: ${submission.scores.totalScore}${submission.questionnaireType === "MCHAT-R" ? "/20" : ""}`);
      if (submission.scores.elevatedItems && submission.scores.elevatedItems.length > 0) {
        doc.text("Elevated likelihood items: " + submission.scores.elevatedItems.join(", "));
      }
      if (submission.scores.domainScores) {
        doc.moveDown(0.5);
        Object.entries(submission.scores.domainScores).forEach(([domain, score]) => {
          doc.text(`  ${domain}: ${score}`);
        });
      }
      if (submission.scores.domainStatuses) {
        doc.text("Domain statuses:");
        Object.entries(submission.scores.domainStatuses).forEach(([domain, status]) => {
          doc.text(`  ${domain}: ${status}`);
        });
      }
      doc.moveDown(1);
    }

    doc.fontSize(9).fillColor("gray").text("AutismCare · Screening Report · Confidential · " + new Date().toLocaleDateString(), { align: "center" });
    doc.end();
  });
}

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

    // Send report by email to the parent; await so we can report success/failure to the client
    let reportEmailed = false;
    let reportEmailError = null;
    try {
      const parent = await User.findById(userId);
      if (!parent || !parent.email) {
        reportEmailError = "No email address on file for this account.";
      } else {
        const child = parent.children && parent.children.find((c) => c._id && c._id.toString() === childId);
        const pdfBuffer = await buildSubmissionPdfBuffer(submission, child);
        const first = (child && child.firstName) || "";
        const last = (child && child.lastName) || "";
        const childName = `${first} ${last}`.trim() || "Child";
        const safeName = childName.replace(/\s+/g, "_");
        const emailOptions = {
          to: parent.email,
          subject: `AutismCare Screening Report – ${questionnaireType} for ${childName}`,
          text: `Please find attached the ${questionnaireType} screening report for ${childName}, generated by AutismCare (ASD Management Platform). This report is confidential.`,
          attachments: [{ filename: `AutismCare_Screening_Report_${safeName}.pdf`, content: pdfBuffer }],
        };
        await sendEmailWithAttachments(emailOptions);
        reportEmailed = true;
        console.log("[calculateScreening] Report sent by email to", parent.email);
      }
    } catch (err) {
      console.error("[calculateScreening] Failed to send report by email:", err.message);
      reportEmailError = err.message || "Email could not be sent.";
    }

    res.status(201).json({
      success: true,
      data: {
        submissionId: submission._id,
        createdAt: submission.createdAt,
        scores,
        result,
        resultDescription,
        riskLevel,
        reportEmailed,
        reportEmailError: reportEmailError || undefined,
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

    // Derive risk level from result (not stored on Submission)
    const riskLevel = submission.result === 'Pass' ? 'low' : submission.result === 'Monitor' ? 'medium' : 'high';

    // Generate PDF report with branding
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AutismCare_Screening_Report_${submission.childId.firstName}_${submission.childId.lastName}.pdf"`);
    doc.pipe(res);

    // Branding header
    doc.fontSize(22).fillColor('teal').text('AutismCare', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('gray').text('ASD Management Platform · Screening Report', { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(1.5);
    doc.fillColor('black');

    doc.fontSize(18).text(`${submission.questionnaireType} Screening Report`);
    doc.moveDown(1);
    doc.fontSize(12).text(`Child: ${submission.childId.firstName} ${submission.childId.lastName}`);
    doc.text(`Date of birth: ${new Date(submission.childId.dateOfBirth).toLocaleDateString()}`);
    doc.text(`Screening date: ${new Date(submission.createdAt).toLocaleDateString()}`);
    doc.moveDown(1);

    doc.fontSize(14).text('Results');
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Result: ${submission.result}`);
    doc.text(`Risk level: ${riskLevel}`);
    if (submission.resultDescription) {
      doc.moveDown(0.5);
      doc.text(submission.resultDescription, { width: 500, align: 'left' });
    }
    doc.moveDown(1);

    if (submission.scores && submission.scores.totalScore !== undefined) {
      doc.fontSize(14).text('Scores');
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Total score: ${submission.scores.totalScore}${submission.questionnaireType === 'MCHAT-R' ? '/20' : ''}`);
      if (submission.scores.elevatedItems && submission.scores.elevatedItems.length > 0) {
        doc.text('Elevated likelihood items: ' + submission.scores.elevatedItems.join(', '));
      }
      if (submission.scores.domainScores) {
        doc.moveDown(0.5);
        Object.entries(submission.scores.domainScores).forEach(([domain, score]) => {
          doc.text(`  ${domain}: ${score}`);
        });
      }
      if (submission.scores.domainStatuses) {
        doc.text('Domain statuses:');
        Object.entries(submission.scores.domainStatuses).forEach(([domain, status]) => {
          doc.text(`  ${domain}: ${status}`);
        });
      }
      doc.moveDown(1);
    }

    doc.fontSize(9).fillColor('gray').text('AutismCare · Screening Report · Confidential · ' + new Date().toLocaleDateString(), { align: 'center' });
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

// Send screening report PDF by email (client uploads the generated PDF)
exports.sendReportByEmail = async (req, res) => {
  try {
    const emailTo = req.body && req.body.emailTo;
    const childName = (req.body && req.body.childName || "Child").trim();
    const screeningType = (req.body && req.body.screeningType) || "Screening";
    const pdfFile = req.file;

    console.log("[sendReportByEmail] emailTo:", emailTo, "| hasFile:", !!pdfFile, "| bodyKeys:", req.body ? Object.keys(req.body) : "none");

    if (!emailTo || typeof emailTo !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email address (emailTo) is required.",
      });
    }
    const to = emailTo.trim();
    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Email address cannot be empty.",
      });
    }

    if (!pdfFile || !pdfFile.buffer) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required. If you see this, the upload may not have been sent correctly.",
      });
    }

    const subject = `AutismCare Screening Report – ${screeningType} for ${childName}`;
    const text = `Please find attached the ${screeningType} screening report for ${childName}, generated by AutismCare (ASD Management Platform). This report is confidential.`;
    const attachments = [
      {
        filename: pdfFile.originalname || "AutismCare_Screening_Report.pdf",
        content: Buffer.isBuffer(pdfFile.buffer) ? pdfFile.buffer : Buffer.from(pdfFile.buffer),
      },
    ];

    console.log("[sendReportByEmail] Sending to", to, "attachment size:", pdfFile.buffer.length);
    await sendEmailWithAttachments({
      to,
      subject,
      text,
      attachments,
    });

    console.log("[sendReportByEmail] Sent successfully to", to);
    res.status(200).json({
      success: true,
      message: "Report sent successfully.",
    });
  } catch (error) {
    console.error("Error sending report by email:", error);
    const errMsg = error && error.message ? error.message : String(error);
    res.status(500).json({
      success: false,
      message: process.env.EMAIL_USER
        ? `Failed to send email: ${errMsg}`
        : "Email is not configured. Set EMAIL_USER and EMAIL_PASS in .env.",
    });
  }
};
