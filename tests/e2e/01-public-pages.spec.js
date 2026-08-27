const { test, expect } = require('@playwright/test');

test.describe('Public Pages', () => {
  test('navigation to home', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle(/ResumeForge/);
  });

  test('navigation to login', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('a[href="pages/login.html"]');
    await expect(page).toHaveURL(/.*login\.html/);
  });

  test('unauthenticated dashboard redirect', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    // Should redirect to login
    await expect(page).toHaveURL(/.*login\.html/);
  });

  test('canonical tag is present (KNOWN BUG)', async ({ page }) => {
    // This is marked as a known bug in the instructions
    await page.goto('/index.html');
    const canonical = await page.$('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
  });

  test('no broken links (KNOWN BUG)', async ({ page }) => {
    await page.goto('/index.html');
    const links = await page.$$eval('a', as => as.map(a => a.href));
    for (const link of links) {
      if (link.startsWith('http') && !link.includes('github') && !link.includes('linkedin')) {
        const response = await page.request.get(link);
        expect(response.ok()).toBeTruthy();
      }
    }
  });
});
