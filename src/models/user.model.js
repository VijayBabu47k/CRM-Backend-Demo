const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  // Find user by ID
  static async findById(id) {
    const result = await query(
      `SELECT id, email, first_name, last_name, role, status, avatar_url, phone, department, last_login, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0];
  }

  // Create new user
  static async create(userData) {
    const { email, password, firstName, lastName, role = 'user', status = 'active', phone, department } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await query(
      `INSERT INTO users (email, password, first_name, last_name, role, status, phone, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, role, status, phone, department, created_at`,
      [email.toLowerCase(), hashedPassword, firstName, lastName, role, status, phone, department]
    );
    
    return result.rows[0];
  }

  // Update user
  static async update(id, userData) {
    const { firstName, lastName, role, status, phone, department, avatarUrl } = userData;
    
    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           role = COALESCE($4, role),
           status = COALESCE($5, status),
           phone = COALESCE($6, phone),
           department = COALESCE($7, department),
           avatar_url = COALESCE($8, avatar_url)
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, avatar_url, phone, department, created_at, updated_at`,
      [id, firstName, lastName, role, status, phone, department, avatarUrl]
    );
    
    return result.rows[0];
  }

  // Update password
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await query(
      'UPDATE users SET password = $2 WHERE id = $1 RETURNING id',
      [id, hashedPassword]
    );
    
    return result.rows[0];
  }

  // Delete user
  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  // Get all users with pagination and search
  static async findAll({ page = 1, limit = 10, search = '', status = '', role = '', sortBy = 'created_at', sortOrder = 'DESC' }) {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` AND (
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR
        department ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    // Validate sortBy and sortOrder to prevent SQL injection
    const validSortColumns = ['created_at', 'first_name', 'last_name', 'email', 'status', 'role'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get users
    const result = await query(
      `SELECT id, email, first_name, last_name, role, status, avatar_url, phone, department, last_login, created_at, updated_at
       FROM users 
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    
    return {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Update last login
  static async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get user statistics
  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE status = 'active') as active_users,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_month
      FROM users
    `);
    
    return result.rows[0];
  }
}

module.exports = UserModel;
