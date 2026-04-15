const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const sharp = require('sharp');

function getServiceUrl() {
  return (
    process.env.FACIAL_SCREENING_SERVICE_URL ||
    'http://127.0.0.1:8001'
  ).replace(/\/$/, '');
}

function getPublicUploadPath(relativePath) {
  // Exposed via app.use('/uploads', express.static(...))
  return `/uploads/${relativePath.replace(/^[\\/]+/, '').replace(/\\/g, '/')}`;
}

async function saveBlurredCopy(buffer, ext) {
  const safeExt = (ext || '.jpg').toLowerCase();
  const outExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(safeExt) ? safeExt : '.jpg';
  const name = `${getCurrentTimeMs()}-${crypto.randomBytes(8).toString('hex')}${outExt}`;

  const relDiskPath = path.join('facial-screening', name);
  const absDiskPath = path.join(process.cwd(), 'uploads', relDiskPath);

  // Strong blur for privacy. Keep size reasonable.
  const blurred = await sharp(buffer)
    .rotate()
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .blur(18)
    .toFormat(outExt === '.png' ? 'png' : outExt === '.webp' ? 'webp' : 'jpeg', { quality: 80 })
    .toBuffer();

  await fs.writeFile(absDiskPath, blurred);
  return getPublicUploadPath(relDiskPath);
}

async function predictFacialScreening(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Missing image file (field name: image)' });
    }

    const serviceUrl = getServiceUrl();
    let blurredImageUrl;
    try {
      blurredImageUrl = await saveBlurredCopy(req.file.buffer, path.extname(req.file.originalname || ''));
    } catch (blurErr) {
      return res.status(400).json({
        message: 'Could not process this image. Try a clear JPG or PNG under 5MB.',
        error: blurErr?.message || String(blurErr),
      });
    }

    // Node 18+ provides fetch/FormData/Blob via undici.
    if (typeof fetch !== 'function' || typeof FormData !== 'function' || typeof Blob !== 'function') {
      return res.status(500).json({
        message:
          'Server runtime missing fetch/FormData/Blob. Please run Node 18+ or add a fetch polyfill.',
      });
    }

    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' });
    form.append('image', blob, req.file.originalname || 'image.jpg');

    let resp;
    try {
      resp = await fetch(`${serviceUrl}/predict`, {
        method: 'POST',
        body: form,
      });
    } catch (netErr) {
      const code = netErr?.code || netErr?.cause?.code;
      const hint =
        code === 'ECONNREFUSED' || code === 'ENOTFOUND'
          ? ` Start the Python facial screening service (see server/ml/README.md), default URL ${serviceUrl}.`
          : '';
      return res.status(503).json({
        message: `Cannot reach the facial screening service.${hint}`.trim(),
        error: netErr?.message || String(netErr),
      });
    }

    const text = await resp.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    if (!resp.ok) {
      const detailMsg =
        typeof payload?.detail === 'string'
          ? payload.detail
          : typeof payload?.message === 'string'
            ? payload.message
            : null;
      return res.status(502).json({
        message: detailMsg || 'Facial screening ML service returned an error.',
        status: resp.status,
        details: payload,
      });
    }

    // Don’t cache sensitive screening responses.
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ...payload, blurredImageUrl });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to predict facial screening',
      error: err?.message || String(err),
    });
  }
}

module.exports = { predictFacialScreening };

