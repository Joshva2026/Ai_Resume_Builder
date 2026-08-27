const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {
  let user;

  test.beforeEach(async ({ page }, testInfo) => {
    const uniqueId = `${Date.now()}_${testInfo.workerIndex}`;
    user = {
      username: `dash_user_${uniqueId}`,
      email: `dash_${uniqueId}@example.com`,
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

  test('no placeholder data for new user', async ({ page }) => {
    // A new user should not have any template data
    await page.goto('/pages/dashboard.html');
    
    // Wait for the JS to fetch and render the resumes
    await page.waitForTimeout(1500); 

    // The new empty state is a dashed dashed create resume card.
    // There are NO actual resumes, so the total count of .resume-list-item will be 1 (just the create button)
    const resumeCount = await page.locator('.resume-list-item').count();
    expect(resumeCount).toBe(1);
    
    const createCard = page.locator('.resume-list-item').first();
    await expect(createCard).toBeVisible({ timeout: 5000 });
    await expect(createCard).toContainText(/Create New Resume/i);
  });
});
