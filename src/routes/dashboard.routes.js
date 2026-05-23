const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Dashboard overview
router.get('/overview', dashboardController.getOverview);

// User analytics
router.get('/users/analytics', dashboardController.getUserAnalytics);

// Revenue analytics
router.get('/revenue/analytics', dashboardController.getRevenueAnalytics);

// Activity analytics
router.get('/activities/analytics', dashboardController.getActivityAnalytics);

// Charts data
router.get('/charts/revenue', dashboardController.getRevenueChartData);
router.get('/charts/users', dashboardController.getUserChartData);
router.get('/charts/activities', dashboardController.getActivityChartData);

module.exports = router;
