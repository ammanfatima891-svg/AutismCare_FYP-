const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validateFileStrict } = require('./uploadValidation');

const uploadDir = path.join(process.cwd(), 'uploads/home-assignments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safe = `ha-${req.params.id}-${getCurrentTimeMs()}${ext}`;
    cb(null, safe);
  },
});

const uploadHomeAssignmentEvidence = multer({
  storage,
  // Allow up to 25MB so video uploads work (validator enforces per-kind caps).
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Evidence uploads: images or short videos only (mobile-friendly).
    const v = validateFileStrict({ ...file, size: 0 }, ['image', 'video']);
    if (v.ok) return cb(null, true);
    cb(new Error('Only image or video files are allowed'));
  },
});

module.exports = { uploadHomeAssignmentEvidence, uploadDir };
