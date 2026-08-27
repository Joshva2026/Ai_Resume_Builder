const { test, expect } = require('@playwright/test');

test.describe('ResumeForge Interactive Tools Suite', () => {
  test('should redirect guest users attempting to load ATS Checker to the secure login screen', async ({ page }) => {
    await page.goto('/pages/ats-checker.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
    const heading = page.locator('h1:has-text("Welcome Back")');
    await expect(heading).toBeVisible();
  });

  test('should redirect guest users attempting to load Resume Builder to the secure login screen', async ({ page }) => {
    await page.goto('/pages/resume-builder.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
    const heading = page.locator('h1:has-text("Welcome Back")');
    await expect(heading).toBeVisible();
  });

  test('should successfully load the public Template Selection catalog page', async ({ page }) => {
    await page.goto('/pages/templates.html');
    const title = page.locator('h2:has-text("Resume Templates")');
    await expect(title).toBeVisible();
    const tplPreview = page.locator('#tplPreviewTitle');
    await expect(tplPreview).toBeAttached();
  });

  test('should successfully check that templates page has correct grid layout of templates', async ({ page }) => {
    await page.goto('/pages/templates.html');
    const catalogGrid = page.locator('.templates-grid');
    await expect(catalogGrid).toBeAttached();
  });

  test('should redirect guest users attempting to load AI Assistant to login screen', async ({ page }) => {
    await page.goto('/pages/ai-assistant.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load Cover Letter page to login screen', async ({ page }) => {
    await page.goto('/pages/cover-letter.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load LinkedIn Review to login screen', async ({ page }) => {
    await page.goto('/pages/linkedin-review.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load Job Match to login screen', async ({ page }) => {
    await page.goto('/pages/job-match.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load Dashboard to login screen', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should redirect guest users attempting to load Resume Preview to login screen', async ({ page }) => {
    await page.goto('/pages/resume-preview.html');
    await expect(page).toHaveURL(/.*login\.html.*/);
  });

  test('should verify required form validation behavior on empty login submit', async ({ page }) => {
    await page.goto('/pages/login.html');
    const emailInput = page.locator('#email');
    const submitBtn = page.locator('button[type="submit"]');

    // Email input starts blank and invalid on submit attempt
    await submitBtn.click();
    const isEmailRequired = await emailInput.evaluate(el => el.required);
    expect(isEmailRequired).toBe(true);
  });
});
