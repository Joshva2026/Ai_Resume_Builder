const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('ATS Checker', () => {
  let user;

  test.beforeEach(async ({ page }, testInfo) => {
    const uniqueId = `${Date.now()}_${testInfo.workerIndex}`;
    user = {
      username: `ats_user_${uniqueId}`,
      email: `ats_${uniqueId}@example.com`,
      password: 'StrongPassword123!',
    };

    // Register & Login via API for speed
    const request = page.context().request;
    const registerRes = await request.post('http://127.0.0.1:5000/api/auth/register', {
      data: { username: user.username, email: user.email, password: user.password }
    });
    expect(registerRes.ok()).toBeTruthy();

    const loginRes = await request.post('http://127.0.0.1:5000/api/auth/login', {
      data: { email: user.email, password: user.password }
    });
    const token = (await loginRes.json()).token;

    await page.goto('/pages/dashboard.html');
    await page.evaluate((t) => localStorage.setItem('rf_access_token', t), token);
  });

  test('upload and scan', async ({ page }) => {
    await page.goto('/pages/ats-checker.html');
    
    // The new UI uses #resumeFileInput which is hidden by default under the drop zone.
    // Playwright setInputFiles handles hidden inputs seamlessly.
    const fileInput = page.locator('#resumeFileInput');
    const filePath = path.join(__dirname, 'fixtures', 'sample-resume.txt');
    await fileInput.setInputFiles(filePath);
    
    await page.fill('#jobDescription', 'Software Engineer with experience in Playwright.');
    
    await page.click('#runScan');
    
    // Wait for results
    const resultsArea = page.locator('.ats-results');
    await expect(resultsArea).toBeVisible({ timeout: 15000 });
    
    const scoreText = page.locator('.gauge-verdict h2');
    await expect(scoreText).toBeVisible({ timeout: 15000 });
    await expect(scoreText).toContainText(/scored/i);
  });
});
