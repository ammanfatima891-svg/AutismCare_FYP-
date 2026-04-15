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

router.use(protect);
router.use(restrictTo('therapist'));

router.post('/', createAssignmentPost);
router.get('/summary', getHomeAssignmentsSummaryForTherapist);
router.get('/', listAllAssignmentsForTherapist);
router.get('/case/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getAssignmentsByCaseAlias);
router.patch('/:id/review', reviewAssignment);

module.exports = router;
