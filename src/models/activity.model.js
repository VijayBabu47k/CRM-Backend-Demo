const { query } = require('../config/database');

class ActivityModel {
  // Create activity
  static async create({ userId, type, description, metadata = {} }) {
    const result = await query(
      `INSERT INTO activities (user_id, type, description, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, type, description, JSON.stringify(metadata)]
    );
    return result.rows[0];
  }

  // Get recent activities
  static async getRecent(limit = 20) {
    const result = await query(
      `SELECT a.*, 
              u.first_name, u.last_name, u.email, u.avatar_url
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Get activities with pagination
  static async findAll({ page = 1, limit = 20, userId = null, type = null }) {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      whereClause += ` AND a.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    if (type) {
      whereClause += ` AND a.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    const countResult = await query(
      `SELECT COUNT(*) FROM activities a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    const result = await query(
      `SELECT a.*, 
              u.first_name, u.last_name, u.email, u.avatar_url
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    
    return {
      activities: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get activity statistics
  static async getStats() {
    const result = await query(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as this_month
      FROM activities
      GROUP BY type
      ORDER BY count DESC
    `);
    
    return result.rows;
  }

  // Get daily activity count for chart
  static async getDailyCount(days = 30) {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activities
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    return result.rows;
  }
}

module.exports = ActivityModel;
