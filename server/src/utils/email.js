function assertResendConfigured() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email not configured. Set RESEND_API_KEY in environment variables.');
  }
  const fromRaw = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const from = (fromRaw || '').replace(/^["']|["']$/g, '').trim();
  if (!from) {
    throw new Error('Email not configured. Set EMAIL_FROM (preferred) or EMAIL_USER.');
  }
  return { from };
}

async function resendSend(payload) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Resend email failed (${resp.status}): ${body}`);
  }
}

const sendEmail = async ({ to, subject, text, html }) => {
  const { from } = assertResendConfigured();
  await resendSend({
    from,
    to: [to],
    subject,
    text: text || (html ? ' ' : ''),
    html: html || undefined,
  });
};

/**
 * Send email with optional HTML and attachments (e.g. PDF report).
 * @param {Object} opts - { to, subject, text, html, attachments: [{ filename, content }] }
 * content must be Buffer (nodemailer accepts Buffer for attachments).
 */
const sendEmailWithAttachments = async ({ to, subject, text, html, attachments }) => {
  const { from } = assertResendConfigured();

  const normalizedAttachments = (attachments || []).map((a) => {
    const contentBuf = Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content);
    return {
      filename: a.filename || 'attachment.pdf',
      // Resend expects base64 string content
      content: contentBuf.toString('base64'),
    };
  });

  await resendSend({
    from,
    to: [to],
    subject,
    text: text || (html ? 'Please see the attached report.' : 'Please see the attached file.'),
    html: html || undefined,
    attachments: normalizedAttachments.length ? normalizedAttachments : undefined,
  });
};

module.exports = sendEmail;
module.exports.sendEmailWithAttachments = sendEmailWithAttachments;
