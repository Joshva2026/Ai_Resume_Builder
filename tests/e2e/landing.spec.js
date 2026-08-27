const { test, expect } = require('@playwright/test');

test.describe('ResumeForge Landing Page Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the production landing page
    await page.goto('/');
  });

  test('should display main brand logo and display headers', async ({ page }) => {
    // Verify logo brand elements are present
    const brand = page.locator('header .brand');
    await expect(brand).toBeVisible();
    await expect(brand).toContainText('ResumeForge');

    // Verify main display heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Build Smarter.');
    await expect(h1).toContainText('Get Hired Faster.');
  });

  test('should show statistic card values', async ({ page }) => {
    // Verify core stats are rendered
    const statCards = page.locator('.hero-stat-card');
    await expect(statCards).toHaveCount(4);
    await expect(statCards.nth(0)).toContainText('20K+');
    await expect(statCards.nth(1)).toContainText('95%');
    await expect(statCards.nth(2)).toContainText('10K+');
    await expect(statCards.nth(3)).toContainText('4.9 ★');
  });

  test('should have CTA buttons pointing to register/login', async ({ page }) => {
    // Force desktop viewport for layout consistency
    await page.setViewportSize({ width: 1280, height: 800 });

    // Verify guest action buttons on navbar
    const loginBtn = page.locator('#navGuestActions .btn-ghost');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveAttribute('href', 'pages/login.html');

    const getStartedBtn = page.locator('#navGuestActions .btn-primary');
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toHaveAttribute('href', 'pages/register.html');
  });

  test('should toggle mobile menu correctly on smaller screens', async ({ page }) => {
    // Resize viewport to mobile dimensions
    await page.setViewportSize({ width: 375, height: 812 });

    // Verify nav toggle button is visible
    const toggleBtn = page.locator('#navToggle');
    await expect(toggleBtn).toBeVisible();

    // Click mobile toggle
    await toggleBtn.click();

    // Verify mobile menu becomes active (has class is-open)
    const mobileMenu = page.locator('#mobileMenu');
    await expect(mobileMenu).toHaveClass(/is-open/);
    
    // Close mobile menu
    const closeBtn = page.locator('#navClose');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify mobile menu is closed (no longer has class is-open)
    await expect(mobileMenu).not.toHaveClass(/is-open/);
  });

  test('should successfully load about page and check its text content', async ({ page }) => {
    await page.goto('/pages/about.html');
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toContainText('We help people turn real experience');
  });

  test('should successfully load contact page and verify input fields', async ({ page }) => {
    await page.goto('/pages/contact.html');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'hello@resumeforge.dev');
  });

  test('should successfully load pricing/upgrade page and display subscription plans', async ({ page }) => {
    await page.goto('/pages/upgrade.html');
    const basicPlan = page.locator('h3:has-text("Basic")');
    const proPlan = page.locator('h3:has-text("Professional")');
    const lifetimePlan = page.locator('h3:has-text("Lifetime")');
    await expect(basicPlan).toBeVisible();
    await expect(proPlan).toBeVisible();
    await expect(lifetimePlan).toBeVisible();
  });

  test('should show correct navigation link hrefs in desktop layout', async ({ page }) => {
    // Force desktop viewport for layout consistency
    await page.setViewportSize({ width: 1280, height: 800 });

    const builderLink = page.locator('.nav-links a[href*="resume-builder.html"]').first();
    const checkerLink = page.locator('.nav-links a[href*="ats-checker.html"]').first();
    const pricingLink = page.locator('.nav-links a[href*="pricing"]').first();
    await expect(builderLink).toBeVisible();
    await expect(checkerLink).toBeVisible();
    await expect(pricingLink).toBeVisible();
  });

  test('should show developer credit and copyright in landing page footer', async ({ page }) => {
    const footer = page.locator('.footer-landing');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Joshva');
    await expect(footer).toContainText('All Rights Reserved');
  });

  test('should load the global navbar with correct link text', async ({ page }) => {
    // Force desktop viewport for layout consistency
    await page.setViewportSize({ width: 1280, height: 800 });

    const navbar = page.locator('#navbar');
    await expect(navbar).toBeVisible();
    await expect(navbar).toContainText('Home');
    await expect(navbar).toContainText('Features');
    await expect(navbar).toContainText('Resume Builder');
    await expect(navbar).toContainText('ATS Checker');
    await expect(navbar).toContainText('Pricing');
  });
});
