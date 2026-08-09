const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, DB_PATH } = require('../server');

const resetDb = () => {
  const initial = { users: [], resumes: [], ats_reports: [], cover_letters: [] };
  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
};

describe('ResumeForge backend', () => {
  beforeEach(() => resetDb());
  afterEach(() => resetDb());

  test('GET /api/health returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
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
