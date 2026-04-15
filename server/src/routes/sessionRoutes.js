const express = require('express');
const router = express.Router();
const {
  listAllSessionsForTherapist,
  createSession,
  getSessionsByCase,
  updateSession,
  signSession,
} = require('../controllers/sessionController');
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('therapist'));

router.get('/', listAllSessionsForTherapist);
router.post('/', createSession);
/** Explicit path avoids ambiguity with future single-session routes; same handler as /:caseId. */
router.get('/case/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getSessionsByCase);
router.patch('/:id/sign', signSession);
router.get('/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getSessionsByCase);
router.patch('/:id', updateSession);

module.exports = router;
