const nodemailer = require('nodemailer');

function normalizeFrom(raw) {
  const v = String(raw || '').trim();
  return v.replace(/^["']|["']$/g, '').trim();
}

function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  const v = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
}

function getEmailDriver() {
  const v = String(process.env.EMAIL_DRIVER || '').trim().toLowerCase();
  if (v === 'sendgrid') return 'sendgrid';
  if (v === 'postmark') return 'postmark';
  return 'smtp';
}

function assertSendgridConfigured() {
  const apiKey = String(process.env.SENDGRID_API_KEY || '').trim();
  const fromRaw = process.env.EMAIL_FROM;
  const from = normalizeFrom(fromRaw);

  if (!apiKey) {
    throw new Error('Email not configured. Set SENDGRID_API_KEY.');
  }
  if (!from) {
    throw new Error('Email not configured. Set EMAIL_FROM (must be a verified sender in SendGrid).');
  }

  return { apiKey, from };
}

function assertPostmarkConfigured() {
  const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim();
  const fromRaw = process.env.EMAIL_FROM;
  const from = normalizeFrom(fromRaw);

  if (!token) {
    throw new Error('Email not configured. Set POSTMARK_SERVER_TOKEN.');
  }
  if (!from) {
    throw new Error('Email not configured. Set EMAIL_FROM (must be an approved sender in Postmark).');
  }

  return { token, from };
}

function parseFromEmail(from) {
  // Accepts: "Name <email@x.com>" or "email@x.com"
  const m = String(from || '').match(/<\s*([^>]+)\s*>/);
  return (m ? m[1] : String(from || '')).trim();
}

function parseFromName(from) {
  const s = String(from || '').trim();
  const m = s.match(/^(.+?)\s*<\s*[^>]+\s*>$/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '').trim() : '';
}

async function sendEmailViaSendgrid({ to, subject, text, html, attachments } = {}) {
  const { apiKey, from } = assertSendgridConfigured();

  const fromEmail = parseFromEmail(from);
  const fromName = parseFromName(from);

  const normalizedAttachments = (attachments || []).map((a) => {
    const contentBuf = Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content);
    return {
      filename: a.filename || 'attachment',
      content: contentBuf.toString('base64'),
      type: a.contentType || undefined,
      disposition: 'attachment',
    };
  });

  const payload = {
    personalizations: [{ to: [{ email: String(to || '').trim() }] }],
    from: fromName ? { email: fromEmail, name: fromName } : { email: fromEmail },
    subject: String(subject || '').trim(),
    content: [
      ...(html ? [{ type: 'text/html', value: html }] : []),
      ...(text ? [{ type: 'text/plain', value: text }] : []),
    ],
    ...(normalizedAttachments.length ? { attachments: normalizedAttachments } : {}),
  };

  if (!payload.content.length) {
    payload.content = [{ type: 'text/plain', value: ' ' }];
  }

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`SendGrid email failed (${resp.status}): ${body}`);
  }

  return { ok: true, success: true, provider: 'sendgrid' };
}

async function sendEmailViaPostmark({ to, subject, text, html, attachments } = {}) {
  const { token, from } = assertPostmarkConfigured();

  const fromEmail = parseFromEmail(from);
  const fromName = parseFromName(from);
  const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  const normalizedAttachments = (attachments || []).map((a) => {
    const contentBuf = Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content);
    const filename = a.filename || 'attachment';
    const contentType = a.contentType || 'application/octet-stream';
    return {
      Name: filename,
      Content: contentBuf.toString('base64'),
      ContentType: contentType,
    };
  });

  const payload = {
    From: fromHeader,
    To: String(to || '').trim(),
    Subject: String(subject || '').trim(),
    TextBody: text || undefined,
    HtmlBody: html || undefined,
    Attachments: normalizedAttachments.length ? normalizedAttachments : undefined,
  };

  if (!payload.TextBody && !payload.HtmlBody) {
    payload.TextBody = ' ';
  }

  const resp = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Postmark email failed (${resp.status}): ${body}`);
  }

  return { ok: true, success: true, provider: 'postmark' };
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

  const host = String(process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = boolEnv('EMAIL_SECURE', port === 465);
  const requireTLS = boolEnv('EMAIL_REQUIRE_TLS', !secure);

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    auth: {
      user,
      pass,
    },
    // Timeouts/pooling: safe defaults for most hosts
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
  // Allows disabling SMTP verification in environments where SMTP is blocked (e.g. Railway).
  if (!boolEnv('EMAIL_VERIFY_ON_STARTUP', true)) return;
  if (getEmailDriver() !== 'smtp') return;

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

    if (getEmailDriver() === 'sendgrid') {
      return await sendEmailViaSendgrid({
        to: normalizedTo,
        subject: normalizedSubject,
        text,
        html,
        attachments,
      });
    }

    if (getEmailDriver() === 'postmark') {
      return await sendEmailViaPostmark({
        to: normalizedTo,
        subject: normalizedSubject,
        text,
        html,
        attachments,
      });
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
      provider: 'smtp',
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

