const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');

test.describe('Resume Builder', () => {
  let user;

  test.beforeEach(async ({ page }, testInfo) => {
    const uniqueId = `${Date.now()}_${testInfo.workerIndex}`;
    user = {
      name: `User ${uniqueId}`,
      email: `e2e_${uniqueId}@example.com`,
      password: 'StrongPassword123!',
    };

    // Register & Login via API for speed
    const request = page.context().request;
    const registerRes = await request.post('http://127.0.0.1:5000/api/auth/register', {
      data: { username: user.name, email: user.email, password: user.password }
    });
    expect(registerRes.ok()).toBeTruthy();

    const loginRes = await request.post('http://127.0.0.1:5000/api/auth/login', {
      data: { email: user.email, password: user.password }
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken || loginData.token;

    await page.goto('/pages/dashboard.html');
    await page.evaluate((t) => localStorage.setItem('rf_access_token', t), token);
  });

  test('navigation and save', async ({ page }) => {
    await page.goto('/pages/resume-builder.html');
    
    // Choose Fresher to skip experience requirements
    await page.waitForSelector('#btnFresher', { timeout: 15000 });
    await page.click('#btnFresher');
    await page.click('#btnStartContinue');

    // Go to personal section
    await page.locator('.rail-item[data-section="personal"]').click();
    await page.waitForSelector('#f_fullName', { timeout: 15000 });

    await page.fill('#f_fullName', user.name);
    await page.fill('#f_headline', 'Software Engineer');
    await page.fill('#f_email', user.email);
    
    // Simulate save by navigating to review and clicking save
    // Fill Required Fields
    await page.locator('.rail-item[data-section="personal"]').click();
    await page.fill('#f_fullName', 'Test');
    await page.fill('#f_email', user.email);
    
    await page.locator('.rail-item[data-section="summary"]').click();
    await page.fill('#f_summary', 'Test Summary');
    
    await page.locator('.rail-item[data-section="education"]').click();
    await page.click('#addEducation');
    await page.fill('.i-school', 'Test University');

    await page.locator('.rail-item[data-section="skills"]').click();
    await page.fill('#f_skills', 'Test Skills');
    
    await page.locator('.rail-item[data-section="review"]').click();
    // Wait for the save API to complete
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/resumes') && res.request().method() === 'POST', { timeout: 10000 }),
      page.click('#btnSave')
    ]);
    
    expect(response.status()).toBe(201);
    
    // Go to dashboard and verify it's there
    await page.goto('/pages/dashboard.html');
    const resumeTitle = page.locator('.resume-list-item h4').first();
    await expect(resumeTitle).toContainText('Untitled Resume'); // Default title if not explicitly set
  });

  test('live preview updates', async ({ page }) => {
    await page.goto('/pages/resume-builder.html');
    
    await page.waitForSelector('#btnFresher', { timeout: 15000 });
    await page.click('#btnFresher');
    await page.click('#btnStartContinue');

    await page.locator('.rail-item[data-section="personal"]').click();
    await page.waitForSelector('#f_fullName', { timeout: 15000 });
    
    await page.fill('#f_fullName', 'Test Name Preview');
    
    // Switch to preview tab if mobile or just check preview pane
    // The rendered name is inside .cv-name or .pac-name depending on template
    const previewName = page.locator('.cv-name, .pac-name').first();
    await expect(previewName).toHaveText('Test Name Preview');
  });
});
