const express = require('express');
const router = express.Router();
const childController = require('../controllers/child.controller.js');
const { protect, restrictTo } = require('../middleware/auth.middleware.js');

// All child routes require authentication and parent role
router.use(protect);
router.use(restrictTo('parent'));

// Routes
router.get('/', childController.getChildren);
router.get('/:id', childController.getChildById);
router.post('/', childController.createChild);
router.put('/:id', childController.updateChild);
router.delete('/:id', childController.deleteChild);

module.exports = router;
