const { test, expect } = require('@playwright/test');

const API_BASE = 'http://127.0.0.1:5000';

test.describe('Deep Workflows - Critical E2E Tests', () => {
  let user;

  test.beforeEach(async ({ }, testInfo) => {
    const uniqueId = `${Date.now()}_${testInfo.workerIndex}`;
    user = {
      username: `testuser_${uniqueId}`,
      email: `e2e_${uniqueId}@example.com`,
      password: 'StrongPassword123!',
    };
  });

  async function getAuthToken(request) {
    const res = await request.post(`${API_BASE}/api/auth/register`, { data: {
      username: user.username,
      email: user.email,
      password: user.password
    }});
    expect(res.ok()).toBeTruthy();
    
    const loginRes = await request.post(`${API_BASE}/api/auth/login`, { data: { email: user.email, password: user.password }});
    expect(loginRes.ok()).toBeTruthy();
    
    const data = await loginRes.json();
    return data.accessToken;
  }

  test('AUTH: Complete Registration, Login, and Dashboard Retrieval', async ({ page }) => {
    // 1. Register
    await page.goto('/pages/register.html');
    await page.fill('#firstName', user.username);
    await page.fill('#lastName', 'Test');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    
    const terms = page.locator('input[name="terms"]');
    if (await terms.count() > 0) await terms.check();

    await page.click('#registerSubmit');

    await expect(page).toHaveURL(/.*dashboard\.html|.*login\.html/, { timeout: 15000 });

    if (page.url().includes('login.html')) {
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
      await page.click('#loginSubmit');
      await expect(page).toHaveURL(/.*dashboard\.html/, { timeout: 15000 });
    }

    const welcome = page.locator('#greetingName');
    await expect(welcome).toContainText(/Good/, { timeout: 15000 });
    
    const token = await page.evaluate(() => localStorage.getItem('rf_access_token'));
    expect(token).toBeTruthy();
  });

  test('RESUME FRESHER: E2E Form filling, Navigation, Save', async ({ page, request }) => {
    const token = await getAuthToken(request);

    await page.addInitScript(token => {
      localStorage.setItem('rf_access_token', token);
    }, token);

    await page.goto('/pages/resume-builder.html');

    // Wait for start screen
    await page.waitForSelector('#btnFresher', { timeout: 15000 });
    await page.click('#btnFresher');
    const startContinue = page.locator('#btnStartContinue');
    await expect(startContinue).toBeEnabled();
    await startContinue.click();

    // Fill required fields for save validation
    // 1. Personal
    await page.locator('.rail-item[data-section="personal"]').click();
    await page.waitForSelector('#f_fullName', { timeout: 15000 });
    await page.fill('#f_fullName', 'Fresher E2E');
    await page.fill('#f_email', user.email);

    // 2. Summary
    await page.locator('.rail-item[data-section="summary"]').click();
    await page.waitForSelector('#f_summary', { timeout: 5000 });
    await page.fill('#f_summary', 'I am a highly motivated fresher.');

    // 3. Education
    await page.locator('.rail-item[data-section="education"]').click();
    await page.waitForSelector('#addEducation', { timeout: 5000 });
    await page.click('#addEducation');
    await page.fill('.i-school', 'Test University');
    await page.fill('.i-degree', 'B.S. Computer Science');

    // 4. Skills
    await page.locator('.rail-item[data-section="skills"]').click();
    await page.waitForSelector('#f_skills', { timeout: 5000 });
    await page.fill('#f_skills', 'JavaScript, HTML, CSS');

    // Skip Experience (Fresher doesn't require it)
    await page.locator('.rail-item[data-section="review"]').click();
    await page.waitForSelector('#btnSave', { timeout: 5000 });
    await page.click('#btnSave');

    // Verify Persistence
    await page.waitForTimeout(2000);
    const historyRes = await request.get(`${API_BASE}/api/resumes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    
    expect(historyData.length).toBeGreaterThan(0);
  });

  test('RESUME PROFESSIONAL: E2E Flow with templates', async ({ page, request }) => {
    const token = await getAuthToken(request);

    await page.addInitScript(token => {
      localStorage.setItem('rf_access_token', token);
    }, token);

    await page.goto('/pages/resume-builder.html');

    // Wait for start screen
    await page.waitForSelector('#btnExperienced', { timeout: 15000 });
    await page.click('#btnExperienced');
    await page.click('#btnStartContinue');

    // Test Template Selection via Preview Style Bar dropdown
    await page.waitForSelector('#selTemplate', { timeout: 15000 });
    await page.selectOption('#selTemplate', 'modern-professional');
    await expect(page.locator('#selTemplate')).toHaveValue('modern-professional');

    // Fill required fields
    await page.locator('.rail-item[data-section="personal"]').click();
    await page.waitForSelector('#f_fullName', { timeout: 15000 });
    await page.fill('#f_fullName', 'Professional E2E');
    await page.fill('#f_email', user.email);

    await page.locator('.rail-item[data-section="summary"]').click();
    await page.waitForSelector('#f_summary', { timeout: 5000 });
    await page.fill('#f_summary', 'Experienced professional with 5 years in tech.');

    await page.locator('.rail-item[data-section="education"]').click();
    await page.waitForSelector('#addEducation', { timeout: 5000 });
    await page.click('#addEducation');
    await page.fill('.i-school', 'Pro University');
    await page.fill('.i-degree', 'M.S. Computer Science');

    // Professional requires Experience
    await page.locator('.rail-item[data-section="experience"]').click();
    await page.waitForSelector('#addExperience', { timeout: 5000 });
    await page.click('#addExperience');
    await page.fill('.i-role', 'Senior Dev');
    await page.fill('.i-company', 'Tech Corp');

    await page.locator('.rail-item[data-section="skills"]').click();
    await page.waitForSelector('#f_skills', { timeout: 5000 });
    await page.fill('#f_skills', 'JavaScript, HTML, CSS, React');
    
    await page.locator('.rail-item[data-section="review"]').click();
    await page.waitForSelector('#btnSave', { timeout: 5000 });
    await page.click('#btnSave');

    await page.waitForTimeout(2000);
    const historyRes = await request.get(`${API_BASE}/api/resumes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    
    expect(historyData.length).toBeGreaterThan(0);
  });

  test('PDF: API request generates valid downloadable PDF file', async ({ request }) => {
    const token = await getAuthToken(request);
    
    expect(token).toBeTruthy();

    const createRes = await request.post(`${API_BASE}/api/resumes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'PDF Test Resume',
        content: {
          personalInfo: { fullName: 'PDF User', jobTitle: 'QA' },
          styling: { template: 'modern' }
        }
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const resumeData = await createRes.json();
    const resumeId = resumeData.resume.id;

    const pdfRes = await request.post(`${API_BASE}/api/download/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { resumeId: resumeId }
    });

    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toBe('application/pdf');

    const buffer = await pdfRes.body();
    const pdfHeader = buffer.toString('utf8', 0, 5);
    expect(pdfHeader).toBe('%PDF-');
  });

  test('ATS: API endpoint returns valid analysis structure', async ({ request }) => {
    const token = await getAuthToken(request);
    
    expect(token).toBeTruthy();

    const createRes = await request.post(`${API_BASE}/api/resumes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'ATS Resume',
        content: {
          personalInfo: { fullName: 'ATS User', jobTitle: 'Dev' },
          styling: { template: 'modern' }
        }
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const createData = await createRes.json();
    const resumeId = createData.resume.id;

    const atsRes = await request.post(`${API_BASE}/api/ats/analyze`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        resumeId: resumeId,
        jobDescription: 'Looking for a developer with React, Node.js and AWS.'
      }
    });

    expect(atsRes.status()).toBe(200);
    const data = await atsRes.json();
    expect(data).toHaveProperty('report');
    expect(data.report.overall_score).toBeGreaterThanOrEqual(0);
    expect(data.report.overall_score).toBeLessThanOrEqual(100);
  });

  test('AI: AI Assistant backend validates prompt and generates response', async ({ request }) => {
    const token = await getAuthToken(request);
    
    expect(token).toBeTruthy();

    const aiRes = await request.post(`${API_BASE}/api/ai/chat`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        message: 'Hello, AI',
        resumeContext: {},
        stream: false
      }
    });

    // We distinguish between successful generation (200) and unconfigured environment (500)
    const status = aiRes.status();
    if (status === 500) {
      const data = await aiRes.json();
      expect(data.error).toContain('Gemini API key is not configured');
    } else {
      expect(status).toBe(200);
      const data = await aiRes.json();
      expect(data).toHaveProperty('reply');
      expect(typeof data.reply).toBe('string');
    }
  });
});
