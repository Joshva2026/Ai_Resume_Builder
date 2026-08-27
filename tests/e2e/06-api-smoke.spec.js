const { test, expect } = require('@playwright/test');
const { generateTestUser } = require('./helpers/test-data');

test.describe('API Smoke', () => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:5000/api';

  test('health endpoint', async ({ request }) => {
    const response = await request.get(`${apiUrl}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('register and login via API', async ({ request }, testInfo) => {
    const uniqueId = `${Date.now()}_${testInfo.workerIndex}`;
    const user = {
      username: `smoke_user_${uniqueId}`,
      email: `smoke_${uniqueId}@example.com`,
      password: 'StrongPassword123!',
    };
    
    // Register
    const regRes = await request.post(`${apiUrl}/auth/register`, {
      data: user
    });
    expect(regRes.ok()).toBeTruthy();
    
    // Login
    const loginRes = await request.post(`${apiUrl}/auth/login`, {
      data: { email: user.email, password: user.password }
    });
    expect(loginRes.ok()).toBeTruthy();
    
    const data = await loginRes.json();
    expect(data.accessToken).toBeDefined();
  });
  
  test('CORS headers', async ({ request }) => {
    const response = await request.fetch(`${apiUrl}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://127.0.0.1:3000'
      }
    });
    expect(response.headers()['access-control-allow-origin']).toBeDefined();
  });
});
