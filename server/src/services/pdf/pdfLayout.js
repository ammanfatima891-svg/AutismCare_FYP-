const { getCurrentTime } = require('../../utils/time.js');

function safeText(v) {
  const s = v == null ? '' : String(v);
  return s.replace(/\s+/g, ' ').trim();
}

function clampNumber(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

class PdfLayout {
  /**
   * @param {import('pdfkit')} doc
   * @param {{ brandName?: string }} [opts]
   */
  constructor(doc, opts = {}) {
    this.doc = doc;
    this.brandName = safeText(opts.brandName) || 'AutismCare';

    this.colors = {
      ink: '#0F172A',
      muted: '#475569',
      border: '#CBD5E1',
      panel: '#F8FAFC',
      brand: '#0B4F6C',
      brandSoft: '#E6F3F8',
    };
  }

  get pageWidth() {
    return this.doc.page.width;
  }

  get pageHeight() {
    return this.doc.page.height;
  }

  get left() {
    return this.doc.page.margins.left;
  }

  get right() {
    return this.doc.page.width - this.doc.page.margins.right;
  }

  get top() {
    return this.doc.page.margins.top;
  }

  get bottom() {
    return this.doc.page.height - this.doc.page.margins.bottom;
  }

  get contentWidth() {
    return this.right - this.left;
  }

  setBodyFont() {
    this.doc.font('Helvetica').fontSize(10).fillColor(this.colors.ink);
  }

  setSmallMuted() {
    this.doc.font('Helvetica').fontSize(9).fillColor(this.colors.muted);
  }

  ensureSpace(minHeight) {
    const y = this.doc.y;
    if (y + minHeight <= this.bottom) return;
    this.doc.addPage();
  }

  writeHeader({ title, subtitle, generatedAt }) {
    const doc = this.doc;
    const t = safeText(title) || 'Clinical Report';
    const st = safeText(subtitle);
    const dateText = safeText(generatedAt) || getCurrentTime().toISOString();

    const bandH = 54;
    const x = this.left;
    const y = this.top - 14;
    const w = this.contentWidth;

    doc.save();
    doc.rect(x, y, w, bandH).fill(this.colors.brandSoft);
    doc.restore();

    doc.fillColor(this.colors.brand).font('Helvetica-Bold').fontSize(16).text(this.brandName, x + 12, y + 12, {
      width: w - 24,
    });

    doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(14).text(t, x + 12, y + 30, {
      width: w - 24,
      align: 'left',
    });

    if (st) {
      doc.fillColor(this.colors.muted).font('Helvetica').fontSize(10).text(st, x + 12, y + 48, {
        width: w - 24,
      });
    }

    doc.fillColor(this.colors.muted).font('Helvetica').fontSize(9).text(`Generated: ${dateText}`, x, y + 14, {
      width: w - 12,
      align: 'right',
    });

    doc.moveDown(2.8);
    this.setBodyFont();
  }

  writeFooterAllPages() {
    const doc = this.doc;
    if (!doc._bufferedPageRange) return;
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const pageNum = i - range.start + 1;
      const total = range.count;
      const footerY = this.pageHeight - doc.page.margins.bottom + 18;

      doc.save();
      doc.strokeColor(this.colors.border).lineWidth(1).moveTo(this.left, footerY - 10).lineTo(this.right, footerY - 10).stroke();
      doc.restore();

      doc.fillColor(this.colors.muted).font('Helvetica').fontSize(9).text(`${this.brandName} • Confidential`, this.left, footerY, {
        width: this.contentWidth,
        align: 'left',
      });
      doc.fillColor(this.colors.muted).font('Helvetica').fontSize(9).text(`Page ${pageNum} of ${total}`, this.left, footerY, {
        width: this.contentWidth,
        align: 'right',
      });
    }
    doc.switchToPage(range.start + range.count - 1);
    this.setBodyFont();
  }

  writePatientInfoBox(info) {
    const doc = this.doc;
    const rows = [
      ['Child', safeText(info?.childName) || '—'],
      ['Parent/Guardian', safeText(info?.parentName) || '—'],
      ['Case ID', safeText(info?.caseId) || '—'],
      ['Therapy duration', safeText(info?.therapyDuration) || '—'],
    ];

    const x = this.left;
    const w = this.contentWidth;
    const y = doc.y;
    const rowH = 16;
    const pad = 10;
    const h = pad * 2 + rowH * rows.length + 16;

    this.ensureSpace(h + 10);

    const y2 = doc.y;
    doc.save();
    doc.rect(x, y2, w, h).fill(this.colors.panel);
    doc.rect(x, y2, w, h).strokeColor(this.colors.border).lineWidth(1).stroke();
    doc.restore();

    doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(11).text('Patient Information', x + pad, y2 + pad, {
      width: w - pad * 2,
    });

    doc.strokeColor(this.colors.border).lineWidth(1).moveTo(x + pad, y2 + pad + 16).lineTo(x + w - pad, y2 + pad + 16).stroke();

    const labelW = Math.floor(w * 0.28);
    let cy = y2 + pad + 24;
    rows.forEach(([label, value]) => {
      doc.fillColor(this.colors.muted).font('Helvetica-Bold').fontSize(9).text(label, x + pad, cy, { width: labelW });
      doc.fillColor(this.colors.ink).font('Helvetica').fontSize(10).text(value, x + pad + labelW + 10, cy, {
        width: w - pad * 2 - labelW - 10,
      });
      cy += rowH;
    });

    doc.y = y2 + h + 12;
    this.setBodyFont();
  }

  section(title, renderFn, opts = {}) {
    const doc = this.doc;
    const t = safeText(title);
    const minHeight = clampNumber(opts.minHeight, 40, 900) ?? 80;

    this.ensureSpace(minHeight);

    const x = this.left;
    const w = this.contentWidth;

    const startPage = doc.page;
    const yStart = doc.y;

    // Title
    doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(12).text(t, x, yStart, { width: w });
    const titleBottom = doc.y + 4;

    doc.save();
    doc.strokeColor(this.colors.brand).lineWidth(2).moveTo(x, titleBottom).lineTo(x + w, titleBottom).stroke();
    doc.restore();

    doc.moveDown(0.8);
    const contentStartY = doc.y;

    this.setBodyFont();
    renderFn();

    const endPage = doc.page;
    const yEnd = doc.y;

    // Box only if it did not flow across pages.
    if (startPage === endPage) {
      const boxY = contentStartY - 6;
      const boxH = Math.max(18, yEnd - boxY + 8);
      doc.save();
      doc.rect(x, boxY, w, boxH).strokeColor(this.colors.border).lineWidth(1).stroke();
      doc.restore();
      doc.y = yEnd + 10;
    } else {
      doc.moveDown(0.6);
    }
  }

  bulletList(items, { max = 18 } = {}) {
    const doc = this.doc;
    const arr = Array.isArray(items) ? items.map(safeText).filter(Boolean) : [];
    if (!arr.length) {
      doc.fillColor(this.colors.muted).text('—');
      this.setBodyFont();
      return;
    }
    arr.slice(0, max).forEach((line) => {
      doc.fillColor(this.colors.ink).text(`• ${line}`, { paragraphGap: 2 });
    });
    this.setBodyFont();
  }

  keyValueGrid(pairs, { columns = 2 } = {}) {
    const doc = this.doc;
    const cols = clampNumber(columns, 1, 3) ?? 2;
    const items = Array.isArray(pairs) ? pairs : [];
    if (!items.length) {
      doc.fillColor(this.colors.muted).text('—');
      this.setBodyFont();
      return;
    }

    const colGap = 16;
    const colW = (this.contentWidth - colGap * (cols - 1)) / cols;
    const startX = this.left;
    const startY = doc.y;
    const rowH = 34;

    items.forEach(([label, value], idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * (colW + colGap);
      const y = startY + row * rowH;

      doc.fillColor(this.colors.muted).font('Helvetica-Bold').fontSize(9).text(safeText(label) || '—', x, y, {
        width: colW,
      });
      doc.fillColor(this.colors.ink).font('Helvetica').fontSize(10).text(safeText(value) || '—', x, y + 12, {
        width: colW,
      });
    });

    const rows = Math.ceil(items.length / cols);
    doc.y = startY + rows * rowH;
    this.setBodyFont();
  }

  table({ columns, rows, maxRows = 18 }) {
    const doc = this.doc;
    const cols = Array.isArray(columns) ? columns : [];
    const data = Array.isArray(rows) ? rows : [];

    if (!cols.length) {
      doc.fillColor(this.colors.muted).text('—');
      this.setBodyFont();
      return;
    }

    const x = this.left;
    const w = this.contentWidth;
    const headerH = 20;
    const rowH = 18;
    const pad = 6;

    const widths = cols.map((c) => (c.widthPct ? (w * c.widthPct) / 100 : w / cols.length));
    const totalW = widths.reduce((a, b) => a + b, 0);
    const scale = totalW > 0 ? w / totalW : 1;
    const colW = widths.map((cw) => cw * scale);

    const visible = data.slice(0, clampNumber(maxRows, 1, 60) ?? 18);
    const neededH = headerH + visible.length * rowH + 10;
    this.ensureSpace(neededH);

    const y0 = doc.y;

    // Header background
    doc.save();
    doc.rect(x, y0, w, headerH).fill(this.colors.brandSoft);
    doc.rect(x, y0, w, headerH).strokeColor(this.colors.border).lineWidth(1).stroke();
    doc.restore();

    // Header text + vertical separators
    let cx = x;
    cols.forEach((c, i) => {
      doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(9).text(safeText(c.header), cx + pad, y0 + 6, {
        width: colW[i] - pad * 2,
        ellipsis: true,
      });
      cx += colW[i];
      if (i < cols.length - 1) {
        doc.strokeColor(this.colors.border).lineWidth(1).moveTo(cx, y0).lineTo(cx, y0 + headerH).stroke();
      }
    });

    // Rows
    let y = y0 + headerH;
    visible.forEach((r, idx) => {
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        doc.save();
        doc.rect(x, y, w, rowH).fill('#FFFFFF');
        doc.restore();
      }
      doc.strokeColor(this.colors.border).lineWidth(1).moveTo(x, y + rowH).lineTo(x + w, y + rowH).stroke();

      let rx = x;
      cols.forEach((c, i) => {
        const cell = safeText(r?.[c.key]);
        doc.fillColor(this.colors.ink).font('Helvetica').fontSize(9).text(cell || '—', rx + pad, y + 5, {
          width: colW[i] - pad * 2,
          ellipsis: true,
        });
        rx += colW[i];
        if (i < cols.length - 1) {
          doc.strokeColor(this.colors.border).lineWidth(1).moveTo(rx, y).lineTo(rx, y + rowH).stroke();
        }
      });
      y += rowH;
    });

    // Outer border
    doc.save();
    doc.rect(x, y0, w, headerH + visible.length * rowH).strokeColor(this.colors.border).lineWidth(1).stroke();
    doc.restore();

    doc.y = y + 6;
    this.setBodyFont();
  }
}

module.exports = { PdfLayout, safeText };

