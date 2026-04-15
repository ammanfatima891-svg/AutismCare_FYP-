const express = require('express');
const router = express.Router();
const { protect, restrictTo, requireRole, requireOwnership } = require('../middleware/auth.middleware');
const {
  generateReport,
  generateReportByCaseId,
  listMyReports,
  listReportsByCase,
  getReportById,
  downloadReportPdf,
} = require('../controllers/reportController');

router.use(protect);
router.use(requireRole('parent', 'clinician', 'therapist', 'admin'));

router.post('/generate/:caseId', restrictTo('therapist'), requireOwnership({ caseIdParam: 'caseId' }), generateReportByCaseId);
router.post('/', restrictTo('therapist'), generateReport);
router.post('/generate', restrictTo('therapist'), generateReport);
router.get('/', restrictTo('therapist'), listMyReports);
router.get('/view/:id', getReportById);
router.get('/:reportId/download', downloadReportPdf);
router.get('/:caseId', requireOwnership({ caseIdParam: 'caseId' }), listReportsByCase);

module.exports = router;
