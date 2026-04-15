const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const REPORTS_DIR = path.join(process.cwd(), 'uploads', 'reports');

function safeText(v) {
  const s = v == null ? '' : String(v);
  return s.replace(/\s+/g, ' ').trim();
}

function kv(doc, label, value) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value != null && safeText(value) ? safeText(value) : '—');
}

function sectionTitle(doc, text) {
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).text(text);
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10);
}

function bulletList(doc, items) {
  const arr = Array.isArray(items) ? items.filter((x) => safeText(x)) : [];
  if (!arr.length) {
    doc.text('—');
    return;
  }
  arr.slice(0, 18).forEach((line) => {
    doc.text(`• ${safeText(line)}`, { paragraphGap: 2 });
  });
}

function ensureDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

/**
 * Build a simple clinical PDF from integrated report `data` object.
 * @returns {Promise<string>} relative URL path e.g. /uploads/reports/xxx.pdf
 */
async function writeIntegratedReportPdf(reportId, data) {
  ensureDir();
  const filename = `${String(reportId)}.pdf`;
  const absPath = path.join(REPORTS_DIR, filename);
  const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
  const stream = fs.createWriteStream(absPath);
  doc.pipe(stream);

  const childName = safeText(data?.childInfo?.childName) || 'Child';
  const parentName = safeText(data?.childInfo?.parentName) || '';
  const caseId = safeText(data?.childInfo?.caseId) || '';
  const generatedAt = safeText(data?.generatedAt) || getCurrentTime().toISOString();

  doc.font('Helvetica-Bold').fontSize(18).text('Therapy Progress Report');
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10);
  kv(doc, 'Child', childName);
  if (parentName) kv(doc, 'Parent/Guardian', parentName);
  if (caseId) kv(doc, 'Case', caseId);
  kv(doc, 'Generated', generatedAt);
  doc.moveDown(0.6);

  const om = data?.overallMetrics || {};
  sectionTitle(doc, 'Overall');
  kv(doc, 'Composite score (0–5)', om.overallScore != null ? String(om.overallScore) : null);
  kv(doc, 'Improvement rate', om.improvementRate != null ? String(om.improvementRate) : null);
  kv(
    doc,
    'Home practice consistency',
    om.consistency != null ? `${(Number(om.consistency) * 100).toFixed(0)}%` : null
  );

  sectionTitle(doc, 'Domain performance');
  const doms = Array.isArray(data?.domainPerformance) ? data.domainPerformance : [];
  if (!doms.length) {
    doc.text('—');
  } else {
    doms.slice(0, 12).forEach((d) => {
      const name = safeText(d?.name) || '—';
      const score = d?.score != null ? String(d.score) : '—';
      const status = safeText(d?.status) || '';
      doc.text(`• ${name}: ${score} / 5${status ? ` (${status})` : ''}`, { paragraphGap: 1 });
    });
  }

  sectionTitle(doc, 'Recommendations');
  const rec = Array.isArray(data?.recommendations) ? data.recommendations : [];
  bulletList(doc, rec);

  sectionTitle(doc, 'Notes');
  const notes = safeText(data?.notes);
  doc.text(notes || '—');

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return `/uploads/reports/${filename}`;
}

async function writeGenericReportPdf(reportId, type, data) {
  ensureDir();
  const filename = `${String(reportId)}.pdf`;
  const absPath = path.join(REPORTS_DIR, filename);
  const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
  const stream = fs.createWriteStream(absPath);
  doc.pipe(stream);

  const reportType = safeText(type) || 'Report';
  const generatedAt = safeText(data?.generatedAt) || getCurrentTime().toISOString();
  const childName = safeText(data?.childInfo?.childName || data?.childName) || 'Child';
  const caseId = safeText(data?.caseId) || safeText(data?.childInfo?.caseId) || '';

  doc.font('Helvetica-Bold').fontSize(18).text(reportType.replace(/_/g, ' ').toUpperCase());
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10);
  kv(doc, 'Child', childName);
  if (caseId) kv(doc, 'Case', caseId);
  kv(doc, 'Generated', generatedAt);

  const summary = safeText(data?.summary || data?.headline || data?.note);
  sectionTitle(doc, 'Summary');
  doc.text(summary || '—');

  const metrics = data?.overallMetrics || data?.metrics || null;
  if (metrics && typeof metrics === 'object') {
    sectionTitle(doc, 'Key metrics');
    const keys = Object.keys(metrics).slice(0, 16);
    if (!keys.length) doc.text('—');
    keys.forEach((k) => {
      const v = metrics[k];
      kv(doc, k, typeof v === 'number' ? String(v) : safeText(v));
    });
  }

  sectionTitle(doc, 'Recommendations');
  bulletList(doc, data?.recommendations || data?.actions || data?.nextSteps);

  sectionTitle(doc, 'Appendix (raw payload excerpt)');
  doc.font('Courier').fontSize(8).text(JSON.stringify(data, null, 2).slice(0, 6000) || '—');
  doc.font('Helvetica').fontSize(10);

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return `/uploads/reports/${filename}`;
}

module.exports = {
  writeIntegratedReportPdf,
  writeGenericReportPdf,
  REPORTS_DIR,
};
