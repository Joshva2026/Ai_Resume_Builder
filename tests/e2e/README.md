# Playwright E2E Test Suite

## Setup

1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. Run Tests:
   ```bash
   npx playwright test
   ```

Environment variables:
- `PLAYWRIGHT_BASE_URL`: Frontend URL (default: http://127.0.0.1:3000)
- `PLAYWRIGHT_API_URL`: Backend API URL (default: http://127.0.0.1:5000/api)
