function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build a screening result email (non-diagnostic summary).
 * @param {Object} input
 * @param {string} input.childName
 * @param {string} input.questionnaireType
 * @param {string} input.result
 * @param {string} input.riskLevel - low|medium|high|unknown
 * @param {string=} input.resultDescription
 */
function screeningResultTemplate({ childName, questionnaireType, result, riskLevel, resultDescription }) {
  const safeChild = childName ? String(childName) : 'your child';
  const safeType = questionnaireType ? String(questionnaireType) : 'Screening';
  const safeRisk = (riskLevel || 'unknown').toString().toUpperCase();

  const subject = `AutismCare: ${safeType} results for ${safeChild}`;
  const text =
    `Here is a summary of the ${safeType} screening results for ${safeChild}.\n\n` +
    `Result: ${result || '—'}\n` +
    `Risk level: ${riskLevel || 'unknown'}\n\n` +
    (resultDescription ? `Notes: ${resultDescription}\n\n` : '') +
    `This screening is not a diagnosis. If you have concerns, please consult your clinician.\n`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">AutismCare screening summary</h2>
      <p style="margin: 0 0 12px;">
        Here is a summary of the <strong>${escapeHtml(safeType)}</strong> screening results for
        <strong>${escapeHtml(safeChild)}</strong>.
      </p>
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #f8fafc; margin: 0 0 12px;">
        <div><strong>Result:</strong> ${escapeHtml(result || '—')}</div>
        <div><strong>Risk level:</strong> ${escapeHtml(safeRisk)}</div>
        ${
          resultDescription
            ? `<div style="margin-top: 8px;"><strong>Notes:</strong> ${escapeHtml(resultDescription)}</div>`
            : ''
        }
      </div>
      <p style="margin: 0; color: #334155;">
        This screening is <strong>not a diagnosis</strong>. If you have concerns, please consult your clinician.
      </p>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { screeningResultTemplate };

