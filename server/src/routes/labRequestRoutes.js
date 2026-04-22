const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { ensureLab, ensureClinician, ensureApprovedLab } = require('../middleware/labAccess.middleware');
const {
  createLabRequest,
  getLabRequestsByChild,
  getMyLabRequests,
  acceptLabRequest,
  uploadLabReport,
} = require('../controllers/labRequestController');

router.use(protect);

// Clinician actions
router.post('/', ensureClinician, createLabRequest);

// Shared read access (clinician, parent, therapist) enforced inside controller by child ownership/case access.
router.get('/by-child/:childId', getLabRequestsByChild);

// Lab actions
router.get('/my-requests', ensureLab, getMyLabRequests);
router.put('/:id/accept', ensureApprovedLab, acceptLabRequest);
router.put('/:id/upload-report', ensureApprovedLab, uploadLabReport);

module.exports = router;
