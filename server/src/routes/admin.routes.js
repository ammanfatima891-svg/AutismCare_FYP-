const express = require('express');
const { getPendingProfessionals, updateProfessionalStatus } = require('../controllers/admin.controller');

const router = express.Router();

// Get all pending professionals
router.get('/pending-professionals', getPendingProfessionals);

// Update professional status (approve/reject)
router.post('/update-professional-status', updateProfessionalStatus);

module.exports = router;
