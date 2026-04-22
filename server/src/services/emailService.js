const nodemailer = require('nodemailer');

function normalizeFrom(raw) {
  const v = String(raw || '').trim();
  return v.replace(/^["']|["']$/g, '').trim();
}

function assertEmailConfigured() {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  const from = normalizeFrom(process.env.EMAIL_FROM || user);

  if (!user || !pass) {
    throw new Error('Email not configured. Set EMAIL_USER and EMAIL_PASS.');
  }
  if (!from) {
    throw new Error('Email not configured. Set EMAIL_FROM (preferred) or EMAIL_USER.');
  }

  return { user, pass, from };
}

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const { user, pass } = assertEmailConfigured();

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

/**
 * Reusable email sender.
 * @param {Object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string=} opts.text
 * @param {string=} opts.html
 * @param {Array=} opts.attachments - nodemailer attachments (optional)
 */
async function sendEmail({ to, subject, text, html, attachments } = {}) {
  try {
    const { from } = assertEmailConfigured();
    const transporter = getTransporter();

    const normalizedTo = String(to || '').trim();
    const normalizedSubject = String(subject || '').trim();

    if (!normalizedTo) {
      return { ok: false, error: 'Missing "to" email address.' };
    }
    if (!normalizedSubject) {
      return { ok: false, error: 'Missing "subject".' };
    }
    if (!text && !html) {
      return { ok: false, error: 'Missing "text" or "html" body.' };
    }

    const info = await transporter.sendMail({
      from,
      to: normalizedTo,
      subject: normalizedSubject,
      text: text || (html ? ' ' : ''),
      html: html || undefined,
      attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
    });

    return {
      ok: true,
      messageId: info && info.messageId ? info.messageId : undefined,
      accepted: info && info.accepted ? info.accepted : undefined,
      rejected: info && info.rejected ? info.rejected : undefined,
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
};

