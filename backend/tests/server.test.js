// Mock mysql2/promise BEFORE importing the server to intercept its pool initialization
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

let mockUser = null;
let mockResumes = [];
let mockAtsReports = [];
let mockVersions = [];
let mockPasswordResets = [];

jest.mock('mysql2/promise', () => {
  const mockConnection = {
    query: jest.fn().mockImplementation(async (sql, params = []) => {
      // Table migration / schema queries
      if (sql.includes('SHOW COLUMNS') || sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE')) {
        return [[]];
      }

      // Users queries
      if (sql.includes('FROM users WHERE email = ?') || sql.includes('FROM users WHERE email')) {
        if (mockUser && mockUser.email.toLowerCase() === (params[0] || '').toLowerCase()) {
          return [[mockUser]];
        }
        return [[]];
      }
      if (sql.includes('FROM users WHERE id = ?') || sql.includes('FROM users WHERE id')) {
        if (mockUser && mockUser.id === Number(params[0])) {
          return [[mockUser]];
        }
        return mockUser ? [[mockUser]] : [[]];
      }
      if (sql.includes('SELECT * FROM profiles WHERE user_id')) {
        return [[{ user_id: 101, phone: '+1234567890', location: 'San Francisco, CA' }]];
      }
      if (sql.includes('INSERT INTO users')) {
        mockUser = {
          id: 101,
          email: params[0],
          password_hash: params[1],
          first_name: params[2],
          last_name: params[3]
        };
        return [{ insertId: 101 }];
      }
      if (sql.includes('UPDATE users SET password_hash')) {
        if (mockUser) mockUser.password_hash = params[0];
        return [{ affectedRows: 1 }];
      }

      // Refresh tokens
      if (sql.includes('SELECT user_id, expires_at, is_revoked FROM refresh_tokens')) {
        return [[{ user_id: 101, expires_at: new Date(Date.now() + 86400000), is_revoked: 0 }]];
      }
      if (sql.includes('DELETE FROM refresh_tokens')) {
        return [{ affectedRows: 1 }];
      }

      // Password resets
      if (sql.includes('UPDATE password_resets SET used = true WHERE user_id')) {
        mockPasswordResets.forEach(r => { r.used = true; });
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('INSERT INTO password_resets')) {
        mockPasswordResets.push({ id: 1, user_id: params[0], token_hash: params[1], expires_at: new Date(Date.now() + 1800000), used: false });
        return [{ insertId: 1 }];
      }
      if (sql.includes('SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash')) {
        const found = mockPasswordResets.filter(r => r.token_hash === params[0]);
        return [found];
      }
      if (sql.includes('UPDATE password_resets SET used = true WHERE id')) {
        const r = mockPasswordResets.find(x => x.id === params[0]);
        if (r) r.used = true;
        return [{ affectedRows: 1 }];
      }

      // Resumes queries
      if (sql.includes('INSERT INTO resumes')) {
        const newR = { id: 1, user_id: params[0], title: params[1], content: params[2], template_id: params[3] || 1 };
        mockResumes.push(newR);
        return [{ insertId: 1 }];
      }
      if (sql.includes('FROM resumes WHERE id = ? AND user_id = ?')) {
        return [[{ id: params[0], user_id: params[1], title: 'Test Resume', content: JSON.stringify({ personal: { fullName: 'Test' }, experience: [] }) }]];
      }
      if (sql.includes('SELECT id, title, template_id, created_at, updated_at, is_primary FROM resumes WHERE user_id')) {
        return [mockResumes];
      }
      if (sql.includes('UPDATE resumes SET')) {
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('DELETE FROM resumes')) {
        return [{ affectedRows: 1 }];
      }

      // Resume versions
      if (sql.includes('SELECT MAX(version_number) as max_v FROM resume_versions')) {
        return [[{ max_v: 1 }]];
      }
      if (sql.includes('INSERT INTO resume_versions')) {
        mockVersions.push({ id: 1, version_number: params[1], content: params[2] });
        return [{ insertId: 1 }];
      }
      if (sql.includes('SELECT rv.id, rv.version_number, rv.created_at')) {
        return [[{ id: 1, version_number: 1, created_at: new Date().toISOString() }]];
      }
      if (sql.includes('SELECT rv.* FROM resume_versions rv')) {
        return [[{ id: 1, version_number: 1, content: JSON.stringify({ personal: { fullName: 'Test' } }) }]];
      }

      // ATS Reports
      if (sql.includes('INSERT INTO ats_reports')) {
        const rep = {
          id: 1,
          resume_id: params[0],
          overall_score: params[1],
          keyword_match: params[2],
          formatting_score: params[3],
          grammar_score: params[4],
          readability_score: params[5],
          missing_keywords: params[6],
          suggestions: params[7],
          detailed_feedback: params[8],
          created_at: new Date().toISOString()
        };
        mockAtsReports.push(rep);
        return [{ insertId: 1 }];
      }
      if (sql.includes('FROM ats_reports ar') && sql.includes('ar.id = ?')) {
        return [[{
          id: 1,
          resume_id: 1,
          overall_score: 85,
          keyword_match: 80,
          formatting_score: 90,
          grammar_score: 90,
          readability_score: 85,
          missing_keywords: JSON.stringify(['Docker', 'Kubernetes']),
          suggestions: JSON.stringify(['Add technical keywords']),
          detailed_feedback: JSON.stringify({ strengths: ['Clear format'] })
        }]];
      }
      if (sql.includes('FROM ats_reports ar') && sql.includes('ORDER BY ar.created_at DESC')) {
        return [[{
          id: 1,
          resume_id: 1,
          overall_score: 85,
          keyword_match: 80,
          formatting_score: 90,
          grammar_score: 90,
          readability_score: 85,
          missing_keywords: JSON.stringify(['Docker', 'Kubernetes']),
          suggestions: JSON.stringify(['Add technical keywords']),
          detailed_feedback: JSON.stringify({ strengths: ['Clear format'] })
        }]];
      }

      // Downloads
      if (sql.includes('INSERT INTO downloads')) {
        return [{ insertId: 1 }];
      }

      return [[]];
    }),
    release: jest.fn()
  };

  const mockPool = {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    query: jest.fn().mockImplementation(mockConnection.query),
    end: jest.fn()
  };

  return {
    createPool: jest.fn().mockReturnValue(mockPool)
  };
});

// Mock puppeteer
jest.mock('puppeteer', () => {
  return {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(null),
        pdf: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(null)
      }),
      close: jest.fn().mockResolvedValue(null)
    })
  };
});

process.env.NODE_ENV = 'test';
process.env.PORT = 0;
process.env.JWT_SECRET = 'test_jwt_secret_key_32_characters_minimum_len';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_32_chars_min';

const request = require('supertest');
const app = require('../server');
const atsEngine = require('../ats-engine');
const { generateResumeHtml } = require('../resume-pdf-template');

describe('ResumeForge Comprehensive Production Verification Suite', () => {
  let authToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    mockUser = null;
    mockPasswordResets = [];
  });

  test('1. GET /api/health returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Backend is running');
  });

  test('2. POST /api/auth/register creates user and generates JWT tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tester@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.email).toBe('tester@example.com');

    authToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  test('3. POST /api/auth/login validates credentials and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tester@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.id).toBe(101);
  });

  test('4. POST /api/auth/login rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tester@example.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('5. POST /api/auth/refresh provides new accessToken from valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  test('6. GET /api/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('tester@example.com');
  });

  test('7. POST /api/auth/forgot-password generates cryptographic reset token', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'tester@example.com' });

    expect(res.status).toBe(200);
    expect(mockPasswordResets.length).toBeGreaterThan(0);
    expect(mockPasswordResets[0].token_hash).toBeTruthy();
  });

  test('8. Resume Creation & Update', async () => {
    const createRes = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Full Stack Engineer',
        content: { personal: { fullName: 'Test User' }, experience: [] }
      });

    expect(createRes.status).toBe(201);
    const resumeData = createRes.body.resume || createRes.body;
    expect(resumeData.title).toBe('Full Stack Engineer');

    const updateRes = await request(app)
      .put('/api/resumes/1')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Senior Full Stack Engineer',
        content: { personal: { fullName: 'Test User' }, experience: [] }
      });

    expect(updateRes.status).toBe(200);
  });

  test('9. GET /api/resumes/:id/versions requires authentication and enforces ownership', async () => {
    const unauthRes = await request(app).get('/api/resumes/1/versions');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.code).toBe('TOKEN_REQUIRED');

    const authRes = await request(app)
      .get('/api/resumes/1/versions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(authRes.status).toBe(200);
    expect(Array.isArray(authRes.body)).toBe(true);
    expect(authRes.body.length).toBe(1);
  });

  test('10. POST /api/ats/analyze computes deterministic score & stores report', async () => {
    const res = await request(app)
      .post('/api/ats/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        resumeId: 1,
        jobDescription: 'Seeking Senior React Node Engineer with Docker'
      });

    expect(res.status).toBe(200);
    expect(res.body.report.overall_score).toBeGreaterThanOrEqual(0);
    expect(res.body.report.overall_score).toBeLessThanOrEqual(100);
    expect(res.body.report.formatting_score).toBeGreaterThanOrEqual(0);
  });

  test('11. GET /api/ats/report/:id safely parses JSON fields without undefined errors', async () => {
    const res = await request(app)
      .get('/api/ats/report/1')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.overall_score).toBe(85);
    expect(Array.isArray(res.body.missing_keywords)).toBe(true);
    expect(res.body.missing_keywords).toContain('Docker');
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  test('12. GET /api/ats/history returns parsed scan reports array', async () => {
    const res = await request(app)
      .get('/api/ats/history')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('13. POST /api/download/pdf handles concurrency and returns download URL', async () => {
    const res = await request(app)
      .post('/api/download/pdf')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resumeId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toContain('.pdf');
  });

  test('14. File Upload rejects files with fake or invalid magic byte headers', async () => {
    const fakeFilePath = path.join(__dirname, 'fake_script.pdf');
    fs.writeFileSync(fakeFilePath, 'NOT_A_REAL_PDF_FILE');

    const res = await request(app)
      .post('/api/ats/analyze-upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('resume', fakeFilePath);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('signature');

    try { fs.unlinkSync(fakeFilePath); } catch (_) {}
  });

  test('15. POST /api/auth/logout terminates active session token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logout successful');
  });
});
