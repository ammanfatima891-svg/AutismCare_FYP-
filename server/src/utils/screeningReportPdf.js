/**
 * Shared PDF body for screening reports (email attachment + download).
 * ASQ-3: domain-based only — no overall "risk" or pass/fail framing in the PDF.
 * M-CHAT-R: result + likelihood + total score + elevated items.
 */

function asqZoneParentLabel(status) {
  switch (status) {
    case "normal development":
      return "On track";
    case "need monitoring":
      return "Monitoring zone";
    case "referral for further evaluation":
      return "Below cutoff";
    case "incomplete":
      return "Incomplete";
    default:
      return status || "—";
  }
}

/**
 * @param {import('pdfkit')} doc
 * @param {object} submission - Mongoose doc or plain object with questionnaireType, scores, result, resultDescription, riskLevel
 */
function appendScreeningReportBody(doc, submission) {
  const type = submission.questionnaireType;
  const scores = submission.scores || {};

  if (type === "ASQ-3") {
    doc.fontSize(14).fillColor("black").text("Development by area");
    doc.moveDown(0.35);
    doc.fontSize(10).fillColor("#444444");
    doc.text(
      "ASQ-3 measures five developmental skill areas. Each area is interpreted separately (on track, monitoring zone, or below cutoff). It is not a single overall pass/fail grade or an autism risk score.",
      { width: 500 }
    );
    doc.fillColor("black");
    doc.moveDown(0.6);

    if (
      scores.domainScores &&
      typeof scores.domainScores === "object" &&
      scores.domainStatuses &&
      typeof scores.domainStatuses === "object"
    ) {
      doc.fontSize(12);
      Object.entries(scores.domainScores).forEach(([domain, rawScore]) => {
        const status = scores.domainStatuses[domain];
        const zone = asqZoneParentLabel(status);
        const scorePart = rawScore == null || rawScore === undefined ? "—" : `${rawScore}/60`;
        doc.fillColor("black").fontSize(12).text(`${domain}: ${scorePart} — ${zone}`);
        doc.moveDown(0.12);
        if (status && status !== "normal development" && status !== "unknown") {
          doc.fontSize(9).fillColor("#666666").text(`Scoring note: ${status}`, { width: 500 });
          doc.fillColor("black");
        }
        doc.moveDown(0.35);
      });
    } else {
      doc.fontSize(11).text("Domain scores are not available on file for this submission.");
    }

    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#333333");
    doc.text(
      "Next step: discuss any monitoring or below-cutoff area with your child’s pediatrician. Bring this report to the visit.",
      { width: 500 }
    );
    doc.fillColor("black");
    return;
  }

  if (type === "MCHAT-R") {
    const result = submission.result || "—";
    const rl = submission.riskLevel;
    const derived =
      result === "Pass"
        ? "low"
        : result === "Monitor"
          ? "medium"
          : result === "Fail"
            ? "high"
            : rl === "low" || rl === "medium" || rl === "high"
              ? rl
              : "unknown";
    const lik =
      derived === "low"
        ? "LOW likelihood"
        : derived === "medium"
          ? "MODERATE likelihood"
          : derived === "high"
            ? "HIGH likelihood"
            : String(derived);

    doc.fontSize(14).fillColor("black").text("Results");
    doc.moveDown(0.35);
    doc.fontSize(12);
    doc.text(`Screening result: ${result}`);
    doc.text(`Likelihood: ${lik}`);
    if (submission.resultDescription) {
      doc.moveDown(0.35);
      doc.fontSize(10).text(submission.resultDescription, { width: 500 });
    }
    doc.moveDown(0.5);

    if (scores.totalScore != null && scores.totalScore !== undefined) {
      doc.fontSize(14).text("Scores");
      doc.moveDown(0.3);
      doc.fontSize(12).text(`Total score: ${scores.totalScore}/20`);
      if (scores.elevatedItems && scores.elevatedItems.length > 0) {
        doc.moveDown(0.25);
        doc.text("Elevated likelihood items (for Follow-Up):");
        scores.elevatedItems.forEach((item) => {
          doc.fontSize(10).text(`  • ${item}`, { width: 480 });
        });
      }
    }
    return;
  }

  doc.fontSize(12).text(`Results (${type || "Screening"})`);
  doc.moveDown(0.3);
  doc.text(`Result: ${submission.result || "—"}`);
  if (submission.resultDescription) {
    doc.moveDown(0.3);
    doc.text(submission.resultDescription, { width: 500 });
  }
}

module.exports = { appendScreeningReportBody, asqZoneParentLabel };
