const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  generateReport,
  listMyReports,
  listReportsByCase,
  getReportById,
} = require('../controllers/reportController');

router.use(protect);

router.post('/', restrictTo('therapist'), generateReport);
router.post('/generate', restrictTo('therapist'), generateReport);
router.get('/', listMyReports);
router.get('/view/:id', getReportById);
router.get('/:caseId', listReportsByCase);

module.exports = router;
