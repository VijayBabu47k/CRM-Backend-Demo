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

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
}));

const { query } = require('../src/config/database');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock no existing user
      query.mockResolvedValueOnce({ rows: [] });
      
      // Mock user creation
      query.mockResolvedValueOnce({
        rows: [{
          id: 'new-user-id',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          status: 'active',
        }],
      });
      
      // Mock activity creation
      query.mockResolvedValueOnce({ rows: [{ id: 'activity-id' }] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      // Mock existing user found
      query.mockResolvedValueOnce({
        rows: [{
          id: 'existing-user-id',
          email: 'test@example.com',
        }],
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      // Mock finding user
      query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'test@example.com',
          password: 'hashedPassword',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          status: 'active',
        }],
      });

      // Mock updating last login
      query.mockResolvedValueOnce({ rows: [] });
      
      // Mock activity creation
      query.mockResolvedValueOnce({ rows: [{ id: 'activity-id' }] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      // Mock user not found
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });
});
