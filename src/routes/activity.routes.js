const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// Get recent activities
router.get('/recent', activityController.getRecentActivities);

// Get all activities with pagination
router.get('/', paginationValidation, activityController.getAllActivities);

// Get activity statistics
router.get('/stats', activityController.getActivityStats);

module.exports = router;
