const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use app password for Gmail
    }
  });
}

const sendEmail = async ({ to, subject, text }) => {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text
  });
};

/**
 * Send email with optional HTML and attachments (e.g. PDF report).
 * @param {Object} opts - { to, subject, text, html, attachments: [{ filename, content }] }
 * content must be Buffer (nodemailer accepts Buffer for attachments).
 */
const sendEmailWithAttachments = async ({ to, subject, text, html, attachments }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email not configured. Set EMAIL_USER and EMAIL_PASS in server .env (use Gmail app password for Gmail).');
  }
  const transporter = getTransporter();
  const fromRaw = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const from = (fromRaw || '').replace(/^["']|["']$/g, '').trim() || process.env.EMAIL_USER;
  const mailOptions = {
    from,
    to,
    subject,
    text: text || (html ? 'Please see the attached report.' : ''),
    html: html || undefined,
    attachments: (attachments || []).map((a) => ({
      filename: a.filename || 'attachment.pdf',
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    })),
  };
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
module.exports.sendEmailWithAttachments = sendEmailWithAttachments;
