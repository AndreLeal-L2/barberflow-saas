import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/theme-default.spec.ts',
    '**/hero-background.spec.ts',
    '**/responsive.spec.ts',
    '**/public-design.spec.ts',
    '**/mobile-ergonomics.spec.ts',
    '**/mobile-touch.spec.ts',
  ],
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL },
  webServer: {
    command: 'pnpm start --host 127.0.0.1 --port 4200',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
