const ActivityModel = require('../models/activity.model');
const { asyncHandler } = require('../middleware/error.middleware');

// Get recent activities
exports.getRecentActivities = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  
  const activities = await ActivityModel.getRecent(parseInt(limit));
  
  res.json({
    success: true,
    data: {
      activities: activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        metadata: activity.metadata,
        createdAt: activity.created_at,
        user: activity.first_name ? {
          id: activity.user_id,
          firstName: activity.first_name,
          lastName: activity.last_name,
          email: activity.email,
          avatarUrl: activity.avatar_url
        } : null
      }))
    }
  });
});

// Get all activities with pagination
exports.getAllActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, userId, type } = req.query;
  
  const result = await ActivityModel.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    userId,
    type
  });
  
  res.json({
    success: true,
    data: {
      activities: result.activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        metadata: activity.metadata,
        createdAt: activity.created_at,
        user: activity.first_name ? {
          id: activity.user_id,
          firstName: activity.first_name,
          lastName: activity.last_name,
          email: activity.email,
          avatarUrl: activity.avatar_url
        } : null
      })),
      pagination: result.pagination
    }
  });
});

// Get activity statistics
exports.getActivityStats = asyncHandler(async (req, res) => {
  const stats = await ActivityModel.getStats();
  
  res.json({
    success: true,
    data: {
      stats: stats.map(stat => ({
        type: stat.type,
        total: parseInt(stat.count),
        today: parseInt(stat.today),
        thisWeek: parseInt(stat.this_week),
        thisMonth: parseInt(stat.this_month)
      }))
    }
  });
});
