const { test, expect } = require('@playwright/test');
const { generateTestUser } = require('./helpers/test-data');

test.describe('Authentication', () => {
  let user;
  
  test.beforeEach(() => {
    user = generateTestUser();
  });

  test('registration and login', async ({ page }) => {
    // Register
    await page.goto('/pages/register.html');
    await page.fill('#firstName', user.name.split(' ')[0]);
    await page.fill('#lastName', user.name.split(' ')[1]);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('#registerSubmit');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard\.html/);
    
    // Logout
    // Open user menu dropdown
    await page.click('#userMenuTrigger');
    await page.waitForSelector('#userMenuLogoutBtn', { timeout: 5000 });
    await page.click('#userMenuLogoutBtn');
    
    // Confirm logout in modal
    await page.waitForSelector('#rfModalConfirm', { timeout: 5000 });
    await page.click('#rfModalConfirm');
    await expect(page).toHaveURL(/.*login\.html/);
    
    // Login
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('#loginSubmit');
    await expect(page).toHaveURL(/.*dashboard\.html/);
  });

  test('weak password server-side validation (KNOWN BUG)', async ({ page }) => {
    await page.goto('/pages/register.html');
    await page.fill('#firstName', user.name.split(' ')[0]);
    await page.fill('#lastName', user.name.split(' ')[1]);
    await page.fill('#email', user.email);
    await page.fill('#password', '123');
    await page.click('#registerSubmit');
    
    // Wait for the form error to be visible
    const errorBox = page.locator('#formError');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText(/password/i);
  });
});
