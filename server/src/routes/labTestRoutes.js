const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { ensureApprovedLab } = require('../middleware/labAccess.middleware');
const {
  createLabTest,
  getMyLabTests,
  updateLabTest,
  deleteLabTest,
  getAllLabTests,
  getLabsByTest,
} = require('../controllers/labTestController');

router.use(protect);

// Public listing for authenticated users (primarily clinicians).
router.get('/all', getAllLabTests);
router.get('/by-test/:testName', getLabsByTest);

// Lab-only management (approved labs only).
router.get('/my-tests', ensureApprovedLab, getMyLabTests);
router.post('/', ensureApprovedLab, createLabTest);
router.put('/:id', ensureApprovedLab, updateLabTest);
router.delete('/:id', ensureApprovedLab, deleteLabTest);

module.exports = router;
