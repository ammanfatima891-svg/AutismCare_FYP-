const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    const safe = `ha-${req.params.id}-${Date.now()}${ext}`;
    cb(null, safe);
  },
});

const uploadHomeAssignmentEvidence = multer({
  storage,
  limits: { fileSize: 45 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm|x-msvideo))$/i.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Only image or video files are allowed'));
  },
});

module.exports = { uploadHomeAssignmentEvidence, uploadDir };
