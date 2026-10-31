// @ts-check
const { defineConfig } = require('@playwright/test');

// Адреса можно переопределить через переменные окружения:
// API_URL=http://localhost:3001/api UI_URL=http://localhost:3000 npx playwright test
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.UI_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
});
