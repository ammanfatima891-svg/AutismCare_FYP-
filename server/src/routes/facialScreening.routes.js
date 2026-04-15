const express = require('express');
const multer = require('multer');

const { predictFacialScreening } = require('../controllers/facialScreening.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Keep images in memory; we forward bytes to the ML service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid file type (jpeg/png/webp only)'), ok);
  },
});

// Requires login (any role). If you want to restrict by role, we can add restrictTo().
router.use(protect);
router.use(requireRole('parent', 'clinician', 'admin'));

// multipart/form-data: image=<file>
router.post('/predict', upload.single('image'), predictFacialScreening);

module.exports = router;

