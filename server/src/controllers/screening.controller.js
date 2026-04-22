const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const Questionnaire = require("../models/Questionnaire");
const Submission = require("../models/Submission");
const { User, ROLES } = require("../models/User");
const { scoreMCHATFromDB } = require("../utils/MchatScoring");
const { scoreASQ } = require("../utils/ASQscoring");
const ASQ_CUTOFFS = require("../utils/asqCutoffs");
const { getASQInterval } = require("../utils/ASQinterval");
const { sendEmail } = require("../services/emailService");
const { appendScreeningReportBody } = require("../utils/screeningReportPdf");
const { evaluateDecisionSupport } = require("../services/decisionEngine");
const { createBulkNotifications, NOTIFICATION_TYPES } = require("../utils/notification");
const { buildScreeningSummaryForChild } = require('../services/childCase.service');
const { transitionCase, CASE_EVENTS } = require('../services/caseLifecycleService');
const { getScreeningPlan } = require('../services/screeningOrchestrator');
const { screeningResultTemplate } = require('../emailTemplates/screeningResultTemplate');

function computeAgeMonths(dob) {
  const dt = dob ? new Date(dob) : null;
  if (!dt || Number.isNaN(dt.getTime())) return null;
  const ageDays = Math.floor((getCurrentTimeMs() - dt.getTime()) / (1000 * 60 * 60 * 24));
  const ageMonths = ageDays / 30.44;
  return Number.isFinite(ageMonths) ? ageMonths : null;
}

function asqDomainStatusToZone(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "referral for further evaluation") return "below";
  if (s === "need monitoring") return "close";
  if (s === "normal development") return "above";
  return null;
}

// Build PDF buffer for a submission (for email or download) — ASQ-3 body matches domain-based parent PDF
function buildSubmissionPdfBuffer(submission, child) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

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

    appendScreeningReportBody(doc, submission);

    doc.moveDown(1);
    doc.fontSize(9).fillColor("gray").text("AutismCare · Screening Report · Confidential · " + getCurrentTime().toLocaleDateString(), { align: "center" });
    doc.end();
  });
}

exports.getScreeningPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawChildId = req.query?.childId;
    if (!rawChildId) {
      return res.status(400).json({ success: false, message: 'childId is required' });
    }

    const parent = await User.findById(userId);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const child = parent.children && parent.children.find((c) => c._id && c._id.toString() === String(rawChildId));
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    const ageMonths = computeAgeMonths(child?.dateOfBirth);
    const plan = getScreeningPlan(typeof ageMonths === 'number' ? ageMonths : null, {
      childId: String(rawChildId),
    });

    return res.status(200).json({
      success: true,
      data: {
        childId: String(rawChildId),
        ageMonths,
        plan,
      },
    });
  } catch (error) {
    console.error('Error building screening plan:', error);
    return res.status(500).json({ success: false, message: 'Failed to build screening plan' });
  }
};

// Calculate screening
exports.calculateScreening = async (req, res) => {
  try {
    const { childId, questionnaireType, responses, dob, weeksPreterm, intervalMonths } = req.body;
    const userId = req.user.id;

    if (!childId) {
      return res.status(400).json({ success: false, message: 'childId is required' });
    }

    if (questionnaireType !== 'MCHAT-R' && questionnaireType !== 'ASQ-3') {
      return res.status(400).json({ success: false, message: 'questionnaireType must be MCHAT-R or ASQ-3' });
    }

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ success: false, message: 'responses must be a non-empty array' });
    }

    const parent = await User.findById(userId);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const child = parent.children && parent.children.find((c) => c._id && c._id.toString() === childId);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    if (questionnaireType === 'ASQ-3') {
      const interval = Number(intervalMonths);
      if (!Number.isFinite(interval) || interval <= 0) {
        return res.status(400).json({ success: false, message: 'intervalMonths is required for ASQ-3' });
      }
      if (!ASQ_CUTOFFS[interval]) {
        return res.status(400).json({ success: false, message: `Unsupported ASQ-3 interval: ${interval}` });
      }
    }

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
      if (!questionnaire) {
        return res.status(404).json({ success: false, message: "ASQ-3 questionnaire not found" });
      }
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

    // ---- Decision Support Engine (safe, non-diagnostic) ----
    // Combine latest ASQ-3 + M-CHAT (age aware). If one is missing, engine still returns safe guidance.
    let decisionSupport = null;
    try {
      const ageMonths = computeAgeMonths(child?.dateOfBirth || dob);

      const [latestMchat, latestAsq] = await Promise.all([
        Submission.findOne({ childId, questionnaireType: "MCHAT-R" }).sort({ createdAt: -1 }).lean(),
        Submission.findOne({ childId, questionnaireType: "ASQ-3" }).sort({ createdAt: -1 }).lean(),
      ]);

      const mchatScore = latestMchat?.scores?.totalScore ?? null;

      const asqDomains = [];
      const ds = latestAsq?.scores?.domainStatuses && typeof latestAsq.scores.domainStatuses === "object"
        ? latestAsq.scores.domainStatuses
        : null;
      if (ds) {
        for (const [domain, raw] of Object.entries(ds)) {
          const zone = asqDomainStatusToZone(raw);
          if (zone) asqDomains.push(zone);
        }
      }

      decisionSupport = evaluateDecisionSupport({
        ageMonths: typeof ageMonths === "number" ? ageMonths : 0,
        mchatScore,
        asqDomains,
      });

      // Persist DSE on this submission (snapshot of the combined state at time of submit).
      submission.decisionSupport = decisionSupport;
      await submission.save();

      // HIGH risk -> notify clinicians (non-diagnostic alert to review).
      const urgent =
        decisionSupport?.autismRisk === "HIGH" ||
        decisionSupport?.urgencyLevel === "red";
      if (urgent) {
        const clinicians = await User.find({ role: "clinician", approvalStatus: "active" })
          .select("_id")
          .lean();
        const clinicianIds = clinicians.map((c) => c._id);
        if (clinicianIds.length) {
          await createBulkNotifications(clinicianIds, {
            type: NOTIFICATION_TYPES.SYSTEM,
            title: "Screening flagged for review",
            message:
              "A parent screening result indicates elevated risk or significant developmental concern. Please review the screening record. (Decision support only; not a diagnosis.)",
            relatedResourceType: "Submission",
            relatedResourceId: submission._id,
          });
        }
      }
    } catch (e) {
      console.error("[calculateScreening] DSE failed:", e?.message || e);
      decisionSupport = null;
    }

    // Send report by email to the parent; await so we can report success/failure to the client
    let reportEmailed = false;
    let reportEmailError = null;
    try {
      if (!parent || !parent.email) {
        reportEmailError = "No email address on file for this account.";
      } else {
        const pdfBuffer = await buildSubmissionPdfBuffer(submission, child);
        const first = (child && child.firstName) || "";
        const last = (child && child.lastName) || "";
        const childName = `${first} ${last}`.trim() || "Child";
        const safeName = childName.replace(/\s+/g, "_");
        const summary = screeningResultTemplate({
          childName,
          questionnaireType,
          result,
          riskLevel,
          resultDescription,
        });
        const emailOptions = {
          to: parent.email,
          subject: summary.subject,
          text: summary.text,
          html: summary.html,
          attachments: [{ filename: `AutismCare_Screening_Report_${safeName}.pdf`, content: pdfBuffer }],
        };
        const resp = await sendEmail(emailOptions);
        if (!resp?.ok) throw new Error(resp?.error || 'Email send failed');
        reportEmailed = true;
        console.log("[calculateScreening] Report sent by email to", parent.email);
      }
    } catch (err) {
      console.error("[calculateScreening] Failed to send report by email:", err.message);
      reportEmailError = err.message || "Email could not be sent.";
    }

    // Lifecycle: SCREENING_SUBMITTED -> REVIEW (store risk + latest screening summary)
    try {
      const screeningSummary = await buildScreeningSummaryForChild(childId);
      const skippedMchat = String(req.body?.skippedMchat || '').toLowerCase() === 'true';
      const orderFollowedRaw = req.body?.orderFollowed;
      const orderFollowed =
        typeof orderFollowedRaw === 'boolean'
          ? orderFollowedRaw
          : String(orderFollowedRaw || '').toLowerCase() === 'true'
            ? true
            : String(orderFollowedRaw || '').toLowerCase() === 'false'
              ? false
              : undefined;

      const screeningProgress = {
        ...(questionnaireType === 'MCHAT-R' ? { mchatCompleted: true } : {}),
        ...(questionnaireType === 'ASQ-3' ? { asqCompleted: true } : {}),
        ...(skippedMchat === true ? { skippedMchat: true } : {}),
      };

      await transitionCase({
        parentId: req.user._id,
        childId,
        eventType: CASE_EVENTS.SCREENING_SUBMITTED,
        payload: {
          riskLevel,
          screeningSummary,
          screeningProgress,
          screeningFlow: {
            questionnaireType,
            skippedMchat: skippedMchat === true,
            orderFollowed,
          },
        },
        triggeredBy: req.user._id,
      });
    } catch (e) {
      console.error('[calculateScreening] case lifecycle transition failed:', e?.message || e);
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
        decisionSupport,
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
      const ageDays = Math.floor((getCurrentTimeMs() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24));
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

    // Lifecycle: Parent opening questionnaire => SCREENING_STARTED (best-effort; requires ?childId=)
    try {
      const rawChildId = req.query?.childId;
      const skippedMchat = String(req.query?.skippedMchat || '').toLowerCase() === 'true';
      const orderFollowedRaw = req.query?.orderFollowed;
      const orderFollowed =
        typeof orderFollowedRaw === 'boolean'
          ? orderFollowedRaw
          : String(orderFollowedRaw || '').toLowerCase() === 'true'
            ? true
            : String(orderFollowedRaw || '').toLowerCase() === 'false'
              ? false
              : undefined;
      if (rawChildId && req.user?._id) {
        await transitionCase({
          parentId: req.user._id,
          childId: rawChildId,
          eventType: CASE_EVENTS.SCREENING_STARTED,
          payload: {
            questionnaireType: type,
            screeningFlow: {
              origin: String(req.query?.origin || ''),
              flow: String(req.query?.flow || ''),
              skippedMchat: skippedMchat === true,
              orderFollowed,
            },
          },
          triggeredBy: req.user._id,
        });
      }
    } catch (e) {
      // Best-effort: do not block questionnaire load.
      console.error('[getQuestionnaireByType] case lifecycle transition failed:', e?.message || e);
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

// Get available questionnaires (optionally for one child via ?childId=)
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

    const rawChildId = req.query.childId;
    let childrenToScan = user.children || [];
    if (rawChildId) {
      const match = childrenToScan.filter(
        (c) => {
          const candidateId = c && (c._id || c.id);
          return candidateId && String(candidateId) === String(rawChildId);
        }
      );
      if (match.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Child not found",
        });
      }
      childrenToScan = match;
    }

    const availableQuestionnaires = [];

    const pushQuestionnaire = (entry) => {
      const dup = availableQuestionnaires.some(
        (q) =>
          String(q.childId) === String(entry.childId) &&
          q.type === entry.type &&
          (entry.type !== "ASQ-3" || q.intervalMonths === entry.intervalMonths)
      );
      if (!dup) availableQuestionnaires.push(entry);
    };

    for (const child of childrenToScan) {
      const dob = child?.dateOfBirth ? new Date(child.dateOfBirth) : null;
      if (!dob || Number.isNaN(dob.getTime())) {
        continue;
      }

      const ageDays = Math.floor(
        (getCurrentTimeMs() - dob.getTime()) / (1000 * 60 * 60 * 24)
      );
      const ageMonths = ageDays / 30.44;

      // MCHAT-R available for 16-30 months (month-based, avoids day-window edge misses)
      if (ageMonths >= 16 && ageMonths <= 30) {
        pushQuestionnaire({
          type: "MCHAT-R",
          name: "M-CHAT-R™",
          description: "Modified Checklist for Autism in Toddlers",
          childId: child._id,
          childName: `${child.firstName || ""} ${child.lastName || ""}`.trim() || child.name,
        });
      }

      // ASQ-3 interval derived from canonical utility and available cutoffs.
      try {
        const interval = getASQInterval(ageDays);
        if (ASQ_CUTOFFS[interval]) {
          pushQuestionnaire({
            type: "ASQ-3",
            intervalMonths: interval,
            name: "ASQ-3™",
            description: "Ages & Stages Questionnaire",
            childId: child._id,
            childName: `${child.firstName || ""} ${child.lastName || ""}`.trim() || child.name,
          });
        }
      } catch (err) {
        // Age is outside ASQ-3 range for this child; intentionally no ASQ entry.
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

// Get submission by ID (parents: own children only; clinicians/admins: any)
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

    const role = String(req.user?.role ?? req.jwtRole ?? "").trim().toLowerCase();
    if (role === ROLES.PARENT) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }
      const childIds = (user.children || []).map((c) => String(c._id));
      const sid = submission.childId ? String(submission.childId) : "";
      if (!sid || !childIds.includes(sid)) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }
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
    const now = getCurrentTime();
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

    // Generate PDF report with branding (same body as email attachment)
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

    appendScreeningReportBody(doc, submission);

    doc.moveDown(1);
    doc.fontSize(9).fillColor('gray').text('AutismCare · Screening Report · Confidential · ' + getCurrentTime().toLocaleDateString(), { align: 'center' });
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
    const resp = await sendEmail({
      to,
      subject,
      text,
      attachments,
    });
    if (!resp?.ok) throw new Error(resp?.error || 'Email send failed');

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
