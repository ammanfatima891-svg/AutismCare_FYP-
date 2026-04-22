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
    requireTLS: true,
    auth: {
      user,
      pass,
    },
    // Production hardening (Railway safe defaults)
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: true,
    maxConnections: 3,
    maxMessages: 10,
  });

  return cachedTransporter;
}

function isTestRuntime() {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  return env === 'test' || process.env.JEST_WORKER_ID != null;
}

function shouldSkipRecipient(to) {
  const normalized = String(to || '').trim().toLowerCase();
  if (!normalized) return false;

  // Avoid emailing obvious fake domains in production (common in tests/seeds).
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd) return false;

  return (
    normalized.endsWith('@test.com') ||
    normalized.endsWith('@example.com') ||
    normalized.endsWith('@example.test') ||
    normalized.endsWith('@invalid')
  );
}

function logSmtp(event, extra) {
  const suffix = extra ? ` ${extra}` : '';
  console.log(`[SMTP] ${event}${suffix}`);
}

function logSmtpError(event, err) {
  const msg = err?.message || String(err);
  console.error(`[SMTP] ${event} ${msg}`);
}

/**
 * Non-blocking SMTP verify (never throws / never crashes server).
 * Call this once during startup (best-effort).
 */
function verifySmtpOnStartup() {
  // If not configured, just log and move on.
  try {
    if (isTestRuntime()) return;
    // Don't even attempt if EMAIL_USER/PASS are missing.
    assertEmailConfigured();
  } catch (err) {
    logSmtp('SMTP_FAILED', err?.message || String(err));
    return;
  }

  // Verify asynchronously so startup isn't blocked.
  setImmediate(async () => {
    try {
      logSmtp('SMTP_CONNECTING...');
      const transporter = getTransporter();
      await transporter.verify();
      logSmtp('SMTP_CONNECTED');
    } catch (err) {
      logSmtpError('SMTP_FAILED', err);
    }
  });
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
    const normalizedTo = String(to || '').trim();
    const normalizedSubject = String(subject || '').trim();

    if (!normalizedTo) {
      return { ok: false, success: false, error: 'Missing "to" email address.' };
    }
    if (!normalizedSubject) {
      return { ok: false, success: false, error: 'Missing "subject".' };
    }
    if (!text && !html) {
      return { ok: false, success: false, error: 'Missing "text" or "html" body.' };
    }

    if (isTestRuntime()) {
      return { ok: true, success: true, skipped: true, reason: 'test-runtime' };
    }

    if (shouldSkipRecipient(normalizedTo)) {
      return { ok: true, success: true, skipped: true, reason: 'blocked-recipient-domain' };
    }

    const { from } = assertEmailConfigured();
    const transporter = getTransporter();

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
      success: true,
      messageId: info && info.messageId ? info.messageId : undefined,
      accepted: info && info.accepted ? info.accepted : undefined,
      rejected: info && info.rejected ? info.rejected : undefined,
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('SMTP_EMAIL_ERROR', msg);
    return { ok: false, success: false, error: msg };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
  verifySmtpOnStartup,
};

