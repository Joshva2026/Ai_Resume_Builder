const { test, expect } = require('@playwright/test');

test.describe('ResumeForge Authentication Interface Suite', () => {
  test('should render registration page with all fields', async ({ page }) => {
    await page.goto('/pages/register.html');

    // Confirm form elements exist and are accessible
    const firstName = page.locator('#firstName');
    const lastName = page.locator('#lastName');
    const email = page.locator('#email');
    const password = page.locator('#password');
    const terms = page.locator('input[name="terms"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(firstName).toBeVisible();
    await expect(lastName).toBeVisible();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(terms).not.toBeChecked();
    await expect(submitBtn).toBeVisible();
  });

  test('should render login page with form fields and recover-password link', async ({ page }) => {
    await page.goto('/pages/login.html');

    // Confirm login inputs exist
    const email = page.locator('#email');
    const password = page.locator('#password');
    const rememberMe = page.locator('input[name="remember"]');
    const submitBtn = page.locator('button[type="submit"]');
    const forgotPwdLink = page.locator('a[href*="forgot-password.html"]');

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(rememberMe).not.toBeChecked();
    await expect(submitBtn).toBeVisible();
    await expect(forgotPwdLink).toBeVisible();

    // Verify recovery page navigation
    await forgotPwdLink.click();
    await expect(page).toHaveURL(/forgot-password\.html/);
  });

  test('should verify login page has a link pointing to register page', async ({ page }) => {
    await page.goto('/pages/login.html');
    const registerLink = page.locator('a[href*="register.html"]');
    await expect(registerLink).toBeVisible();
  });

  test('should render forgot-password page and verify its inputs', async ({ page }) => {
    await page.goto('/pages/forgot-password.html');
    const emailInput = page.locator('#email');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('should render reset-password page and verify its inputs', async ({ page }) => {
    await page.goto('/pages/reset-password.html');
    const passwordInput = page.locator('#newPassword');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('should redirect guest users attempting to load settings page', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load profile page', async ({ page }) => {
    await page.goto('/pages/profile.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load applications page', async ({ page }) => {
    await page.goto('/pages/applications.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });
});
