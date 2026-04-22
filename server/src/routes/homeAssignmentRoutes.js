const express = require('express');
const router = express.Router();
const {
  createAssignmentPost,
  getHomeAssignmentsSummaryForTherapist,
  listAllAssignmentsForTherapist,
  getAssignmentsByCaseAlias,
  reviewAssignment,
} = require('../controllers/homeAssignment.controller');
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');
const { validateCaseState } = require('../middleware/validateCaseState');
const { HomeAssignment } = require('../models/HomeAssignment');

router.use(protect);
router.use(restrictTo('therapist'));

router.post(
  '/',
  validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['THERAPY_ACTIVE'],
    actionName: 'CREATE_HOME_ASSIGNMENT',
    message: 'Home assignments can only be created during active therapy (THERAPY_ACTIVE).',
  }),
  createAssignmentPost
);
router.get('/summary', getHomeAssignmentsSummaryForTherapist);
router.get('/', listAllAssignmentsForTherapist);
router.get('/case/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getAssignmentsByCaseAlias);
router.patch(
  '/:id/review',
  async (req, res, next) => {
    try {
      const doc = await HomeAssignment.findById(req.params.id).select('caseId').lean();
      req.body = req.body || {};
      if (doc?.caseId) req.body.caseId = String(doc.caseId);
      return next();
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to validate case state' });
    }
  },
  validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['THERAPY_ACTIVE'],
    actionName: 'REVIEW_HOME_ASSIGNMENT',
    message: 'Assignment review is only available during active therapy (THERAPY_ACTIVE).',
  }),
  reviewAssignment
);

module.exports = router;
