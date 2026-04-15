const express = require('express');
const router = express.Router();
const {
  createReferral,
  getReferralsByCase,
  getAssignedReferrals,
  acceptReferral,
  startReferral,
} = require('../controllers/referralController');
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');

router.use(protect);

// Clinician endpoints
router.post('/', restrictTo('clinician'), createReferral);
router.get('/case/:caseId', restrictTo('clinician'), requireOwnership({ caseIdParam: 'caseId' }), getReferralsByCase);

// Therapist endpoints
router.get('/assigned', restrictTo('therapist'), getAssignedReferrals);
router.patch('/:id/accept', restrictTo('therapist'), acceptReferral);
router.patch('/:id/start', restrictTo('therapist'), startReferral);

module.exports = router;
