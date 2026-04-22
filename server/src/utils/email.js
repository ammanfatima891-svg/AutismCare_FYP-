const { sendEmail } = require('../services/emailService');

// Backward-compatible wrappers for older imports.
module.exports = async ({ to, subject, text, html }) => {
  return await sendEmail({ to, subject, text, html });
};

module.exports.sendEmailWithAttachments = async ({ to, subject, text, html, attachments }) => {
  return await sendEmail({ to, subject, text, html, attachments });
};
