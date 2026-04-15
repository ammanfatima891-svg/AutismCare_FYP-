const multer = require('multer');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PDF_MIMES = new Set(['application/pdf']);
const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/ogg',
]);

function structured(res, message, errorCode) {
  return res.status(400).json({ success: false, message, errorCode: errorCode || 'UPLOAD_INVALID' });
}

function fileKindFromMime(mime) {
  if (IMAGE_MIMES.has(mime)) return 'image';
  if (PDF_MIMES.has(mime)) return 'pdf';
  if (VIDEO_MIMES.has(mime)) return 'video';
  return 'other';
}

function validateFileStrict(file, allowedKinds) {
  if (!file) return { ok: false, message: 'No file uploaded', errorCode: 'UPLOAD_MISSING' };
  const kind = fileKindFromMime(String(file.mimetype || '').toLowerCase());
  if (!allowedKinds.includes(kind)) {
    return {
      ok: false,
      message: `Invalid file type. Allowed: ${allowedKinds.join(', ')}`,
      errorCode: 'UPLOAD_TYPE_NOT_ALLOWED',
    };
  }
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Image is too large (max 5MB).', errorCode: 'UPLOAD_IMAGE_TOO_LARGE' };
  }
  if (kind === 'pdf' && file.size > MAX_PDF_BYTES) {
    return { ok: false, message: 'PDF is too large (max 10MB).', errorCode: 'UPLOAD_PDF_TOO_LARGE' };
  }
  if (kind === 'video' && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, message: 'Video is too large (max 25MB).', errorCode: 'UPLOAD_VIDEO_TOO_LARGE' };
  }
  return { ok: true };
}

/**
 * Wrap a multer single/array handler so errors become JSON 400s.
 */
function wrapMulter(multerHandler) {
  return (req, res, next) => {
    multerHandler(req, res, (err) => {
      if (!err) return next();
      const message =
        err instanceof multer.MulterError
          ? err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large.'
            : 'Upload failed.'
          : err.message || 'Upload failed.';
      return structured(res, message, 'UPLOAD_FAILED');
    });
  };
}

module.exports = {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_VIDEO_BYTES,
  IMAGE_MIMES,
  PDF_MIMES,
  VIDEO_MIMES,
  validateFileStrict,
  wrapMulter,
  structuredUploadError: structured,
};

