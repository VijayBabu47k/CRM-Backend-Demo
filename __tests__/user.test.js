const request = require('supertest');
const { app } = require('../src/server');

// Mock database
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
    connect: jest.fn(),
  },
  transaction: jest.fn(),
}));

// Mock JWT verify for authenticated routes
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ userId: 'admin-user-id' }),
}));

const { query } = require('../src/config/database');

describe('User API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for authenticated user (admin)
    query.mockImplementation((sql) => {
      if (sql.includes('SELECT') && sql.includes('FROM users WHERE id')) {
        return Promise.resolve({
          rows: [{
            id: 'admin-user-id',
            email: 'admin@example.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            status: 'active',
          }],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  describe('GET /api/users', () => {
    it('should return paginated users list', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', first_name: 'User', last_name: 'One', role: 'user', status: 'active' },
        { id: '2', email: 'user2@test.com', first_name: 'User', last_name: 'Two', role: 'user', status: 'active' },
      ];

      query.mockImplementation((sql) => {
        if (sql.includes('COUNT')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM users WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: 'admin-user-id',
              email: 'admin@example.com',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
              status: 'active',
            }],
          });
        }
        if (sql.includes('SELECT') && sql.includes('LIMIT')) {
          return Promise.resolve({ rows: mockUsers });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter users by status', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('COUNT')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (sql.includes('SELECT') && sql.includes('FROM users WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: 'admin-user-id',
              email: 'admin@example.com',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
              status: 'active',
            }],
          });
        }
        if (sql.includes('SELECT') && sql.includes('LIMIT')) {
          return Promise.resolve({
            rows: [{ id: '1', email: 'active@test.com', first_name: 'Active', last_name: 'User', role: 'user', status: 'active' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/users?status=active')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data.users).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user (admin only)', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT') && sql.includes('FROM users WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: 'admin-user-id',
              email: 'admin@example.com',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
              status: 'active',
            }],
          });
        }
        if (sql.includes('SELECT') && sql.includes('email =')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({
            rows: [{
              id: 'new-user-id',
              email: params[0],
              first_name: params[2],
              last_name: params[3],
              role: params[4],
              status: params[5],
            }],
          });
        }
        if (sql.includes('INSERT INTO activities')) {
          return Promise.resolve({ rows: [{ id: 'activity-id' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer mock-token')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: 'user',
          status: 'active',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@test.com');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user (admin only)', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('FROM users WHERE id')) {
          return Promise.resolve({
            rows: [{
              id: 'admin-user-id',
              email: 'admin@example.com',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
              status: 'active',
            }],
          });
        }
        if (sql.includes('DELETE')) {
          return Promise.resolve({ rows: [{ id: 'deleted-user-id' }] });
        }
        if (sql.includes('INSERT INTO activities')) {
          return Promise.resolve({ rows: [{ id: 'activity-id' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/users/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent admin from deleting themselves', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('SELECT')) {
          return Promise.resolve({
            rows: [{
              id: 'admin-user-id',
              email: 'admin@example.com',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
              status: 'active',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/users/admin-user-id')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot delete your own account');
    });
  });
});
