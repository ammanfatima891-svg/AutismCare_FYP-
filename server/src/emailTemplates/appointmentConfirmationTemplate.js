function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Appointment confirmation (created/requested).
 * @param {Object} input
 * @param {string} input.recipientName
 * @param {string} input.childName
 * @param {string} input.appointmentType
 * @param {string} input.preferredDate
 * @param {string} input.preferredTime
 * @param {string} input.mode
 * @param {string} input.professionalName
 */
function appointmentConfirmationTemplate({
  recipientName,
  childName,
  appointmentType,
  preferredDate,
  preferredTime,
  mode,
  professionalName,
}) {
  const subject = `AutismCare: Appointment request received (${appointmentType || 'Appointment'})`;
  const text =
    `Hello ${recipientName || ''},\n\n` +
    `We received your appointment request.\n\n` +
    `Child: ${childName || '—'}\n` +
    `Type: ${appointmentType || '—'}\n` +
    `Preferred: ${preferredDate || '—'} at ${preferredTime || '—'}\n` +
    `Mode: ${mode || '—'}\n` +
    `Professional: ${professionalName || '—'}\n\n` +
    `We will notify you when the professional approves or reschedules.\n`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Appointment request received</h2>
      <p style="margin: 0 0 12px;">
        Hello <strong>${escapeHtml(recipientName || '')}</strong>, we received your appointment request.
      </p>
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #f8fafc;">
        <div><strong>Child:</strong> ${escapeHtml(childName || '—')}</div>
        <div><strong>Type:</strong> ${escapeHtml(appointmentType || '—')}</div>
        <div><strong>Preferred:</strong> ${escapeHtml(preferredDate || '—')} at ${escapeHtml(preferredTime || '—')}</div>
        <div><strong>Mode:</strong> ${escapeHtml(mode || '—')}</div>
        <div><strong>Professional:</strong> ${escapeHtml(professionalName || '—')}</div>
      </div>
      <p style="margin: 12px 0 0; color: #334155;">
        We will notify you when the professional approves or reschedules.
      </p>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { appointmentConfirmationTemplate };

