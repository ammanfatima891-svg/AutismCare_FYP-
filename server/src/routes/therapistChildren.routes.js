const express = require('express');
const router = express.Router();

const { restrictTo, protect } = require('../middleware/auth.middleware');
const { getTherapistChildProfile } = require('../controllers/therapist.controller');

// Therapist-only access to child profiles (assigned children only)
router.use(protect);
router.use(restrictTo('therapist'));

// Get a specific child profile by id
router.get('/:id', getTherapistChildProfile);

module.exports = router;

