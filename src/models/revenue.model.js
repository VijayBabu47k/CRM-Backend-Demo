const { query } = require('../config/database');

class RevenueModel {
  // Create revenue entry
  static async create({ amount, source, description, userId }) {
    const result = await query(
      `INSERT INTO revenue (amount, source, description, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [amount, source, description, userId]
    );
    return result.rows[0];
  }

  // Get revenue statistics
  static async getStats() {
    const result = await query(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE) as today_revenue,
        SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_revenue,
        SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_revenue,
        SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '365 days') as year_revenue,
        AVG(amount) as avg_revenue,
        COUNT(*) as transaction_count
      FROM revenue
    `);
    
    return result.rows[0];
  }

  // Get monthly revenue for chart
  static async getMonthlyRevenue(months = 12) {
    const result = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month_label,
        SUM(amount) as total,
        COUNT(*) as transactions
      FROM revenue
      WHERE created_at >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);
    
    return result.rows;
  }

  // Get revenue by source
  static async getBySource() {
    const result = await query(`
      SELECT 
        source,
        SUM(amount) as total,
        COUNT(*) as count,
        AVG(amount) as average
      FROM revenue
      GROUP BY source
      ORDER BY total DESC
    `);
    
    return result.rows;
  }

  // Get daily revenue for chart
  static async getDailyRevenue(days = 30) {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(amount) as total,
        COUNT(*) as transactions
      FROM revenue
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    return result.rows;
  }

  // Get recent transactions
  static async getRecent(limit = 10) {
    const result = await query(
      `SELECT r.*, u.first_name, u.last_name, u.email
       FROM revenue r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  }
}

module.exports = RevenueModel;
