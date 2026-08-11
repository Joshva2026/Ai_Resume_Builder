// Mock mysql2/promise BEFORE importing the server to intercept its pool initialization
jest.mock('mysql2/promise', () => {
  const mockConnection = {
    query: jest.fn().mockImplementation((sql, params) => {
      if (sql.includes('SELECT id FROM users')) {
        return [[]]; // User doesn't exist yet
      }
      if (sql.includes('INSERT INTO users')) {
        return [{ insertId: 42 }];
      }
      if (sql.includes('INSERT INTO profiles')) {
        return [{}];
      }
      if (sql.includes('INSERT INTO refresh_tokens')) {
        return [{}];
      }
      return [[]];
    }),
    release: jest.fn()
  };

  const mockPool = {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    query: jest.fn().mockResolvedValue([[]]),
    end: jest.fn()
  };

  return {
    createPool: jest.fn().mockReturnValue(mockPool)
  };
});

// Mock puppeteer to avoid ESM export syntax errors during CommonJS testing
jest.mock('puppeteer', () => {
  return {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(null),
        pdf: jest.fn().mockResolvedValue(null)
      }),
      close: jest.fn().mockResolvedValue(null)
    })
  };
});

// Set random port to avoid EADDRINUSE during concurrent test run
process.env.PORT = 0;

const request = require('supertest');
const app = require('../server');

describe('ResumeForge backend', () => {
  test('GET /api/health returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Backend is running');
  });

  test('POST /api/auth/register creates a user and token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'demo@example.com', password: 'password123', firstName: 'Demo', lastName: 'User' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe('demo@example.com');
  });
});
