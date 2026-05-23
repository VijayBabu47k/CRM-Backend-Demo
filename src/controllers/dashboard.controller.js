const UserModel = require('../models/user.model');
const ActivityModel = require('../models/activity.model');
const RevenueModel = require('../models/revenue.model');
const { asyncHandler } = require('../middleware/error.middleware');

// Get dashboard overview
exports.getOverview = asyncHandler(async (req, res) => {
  const [userStats, revenueStats, activityStats, recentActivities] = await Promise.all([
    UserModel.getStats(),
    RevenueModel.getStats(),
    ActivityModel.getStats(),
    ActivityModel.getRecent(5)
  ]);
  
  res.json({
    success: true,
    data: {
      users: {
        total: parseInt(userStats.total_users),
        active: parseInt(userStats.active_users),
        inactive: parseInt(userStats.inactive_users),
        pending: parseInt(userStats.pending_users),
        newThisWeek: parseInt(userStats.new_users_week),
        newThisMonth: parseInt(userStats.new_users_month)
      },
      revenue: {
        total: parseFloat(revenueStats.total_revenue) || 0,
        today: parseFloat(revenueStats.today_revenue) || 0,
        thisWeek: parseFloat(revenueStats.week_revenue) || 0,
        thisMonth: parseFloat(revenueStats.month_revenue) || 0,
        thisYear: parseFloat(revenueStats.year_revenue) || 0,
        average: parseFloat(revenueStats.avg_revenue) || 0,
        transactionCount: parseInt(revenueStats.transaction_count) || 0
      },
      activities: activityStats,
      recentActivities: recentActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
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

// Get user analytics
exports.getUserAnalytics = asyncHandler(async (req, res) => {
  const stats = await UserModel.getStats();
  
  res.json({
    success: true,
    data: {
      totalUsers: parseInt(stats.total_users),
      activeUsers: parseInt(stats.active_users),
      inactiveUsers: parseInt(stats.inactive_users),
      pendingUsers: parseInt(stats.pending_users),
      adminCount: parseInt(stats.admin_count),
      newUsersThisWeek: parseInt(stats.new_users_week),
      newUsersThisMonth: parseInt(stats.new_users_month),
      distribution: {
        byStatus: [
          { name: 'Active', value: parseInt(stats.active_users) },
          { name: 'Inactive', value: parseInt(stats.inactive_users) },
          { name: 'Pending', value: parseInt(stats.pending_users) }
        ],
        byRole: [
          { name: 'Admin', value: parseInt(stats.admin_count) },
          { name: 'User', value: parseInt(stats.total_users) - parseInt(stats.admin_count) }
        ]
      }
    }
  });
});

// Get revenue analytics
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  const [stats, bySource, recentTransactions] = await Promise.all([
    RevenueModel.getStats(),
    RevenueModel.getBySource(),
    RevenueModel.getRecent(10)
  ]);
  
  res.json({
    success: true,
    data: {
      summary: {
        total: parseFloat(stats.total_revenue) || 0,
        today: parseFloat(stats.today_revenue) || 0,
        thisWeek: parseFloat(stats.week_revenue) || 0,
        thisMonth: parseFloat(stats.month_revenue) || 0,
        thisYear: parseFloat(stats.year_revenue) || 0,
        average: parseFloat(stats.avg_revenue) || 0,
        transactionCount: parseInt(stats.transaction_count) || 0
      },
      bySource: bySource.map(source => ({
        name: source.source,
        total: parseFloat(source.total),
        count: parseInt(source.count),
        average: parseFloat(source.average)
      })),
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        source: tx.source,
        description: tx.description,
        createdAt: tx.created_at,
        user: tx.first_name ? {
          firstName: tx.first_name,
          lastName: tx.last_name,
          email: tx.email
        } : null
      }))
    }
  });
});

// Get activity analytics
exports.getActivityAnalytics = asyncHandler(async (req, res) => {
  const [stats, dailyCount] = await Promise.all([
    ActivityModel.getStats(),
    ActivityModel.getDailyCount(30)
  ]);
  
  res.json({
    success: true,
    data: {
      byType: stats.map(stat => ({
        type: stat.type,
        count: parseInt(stat.count),
        today: parseInt(stat.today),
        thisWeek: parseInt(stat.this_week),
        thisMonth: parseInt(stat.this_month)
      })),
      daily: dailyCount.map(day => ({
        date: day.date,
        count: parseInt(day.count)
      }))
    }
  });
});

// Get revenue chart data
exports.getRevenueChartData = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  
  let data;
  if (period === 'daily') {
    data = await RevenueModel.getDailyRevenue(30);
    data = data.map(item => ({
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(item.total),
      transactions: parseInt(item.transactions)
    }));
  } else {
    data = await RevenueModel.getMonthlyRevenue(12);
    data = data.map(item => ({
      label: item.month_label,
      value: parseFloat(item.total),
      transactions: parseInt(item.transactions)
    }));
  }
  
  res.json({
    success: true,
    data: {
      period,
      chartData: data
    }
  });
});

// Get user chart data
exports.getUserChartData = asyncHandler(async (req, res) => {
  const { query } = require('../config/database');
  
  const result = await query(`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
      COUNT(*) as count
    FROM users
    WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `);
  
  const chartData = result.rows.map(row => ({
    label: row.month,
    value: parseInt(row.count)
  }));
  
  res.json({
    success: true,
    data: {
      chartData
    }
  });
});

// Get activity chart data
exports.getActivityChartData = asyncHandler(async (req, res) => {
  const data = await ActivityModel.getDailyCount(30);
  
  const chartData = data.map(item => ({
    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: parseInt(item.count)
  }));
  
  res.json({
    success: true,
    data: {
      chartData
    }
  });
});
