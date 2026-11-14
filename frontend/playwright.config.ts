import { defineConfig, devices } from '@playwright/test';

// Fixed loopback URLs deliberately prevent this destructive suite from targeting production.
const baseURL = 'http://127.0.0.1:4200';
// Only the local API port is configurable; the host and test database stay fixed.
const apiPort = process.env['BARBERFLOW_E2E_API_PORT'] ?? '8080';
if (!/^\d+$/.test(apiPort) || Number(apiPort) < 1024 || Number(apiPort) > 65535) {
  throw new Error('BARBERFLOW_E2E_API_PORT must be a local port between 1024 and 65535.');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI']
    ? [
        ['github'],
        ['list'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/e2e.xml' }],
      ]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/responsive.spec.ts',
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testMatch: '**/responsive.spec.ts' },
  ],
  webServer: [
    {
      name: 'API and isolated test database',
      command: `java -jar target/backend-0.0.1-SNAPSHOT.jar --server.port=${apiPort} --spring.datasource.url=jdbc:postgresql://127.0.0.1:5433/barberflow_e2e --spring.datasource.username=barberflow_e2e --spring.datasource.password=barberflow_e2e`,
      cwd: '../backend',
      url: `http://127.0.0.1:${apiPort}/actuator/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        BARBERFLOW_DATABASE_URL: 'jdbc:postgresql://127.0.0.1:5433/barberflow_e2e',
        BARBERFLOW_DATABASE_USERNAME: 'barberflow_e2e',
        BARBERFLOW_DATABASE_PASSWORD: 'barberflow_e2e',
        BARBERFLOW_API_PORT: apiPort,
        BARBERFLOW_ALLOWED_ORIGINS: baseURL,
        BARBERFLOW_PUBLIC_BASE_URL: baseURL,
        BARBERFLOW_MAIL_DELIVERY: 'log',
        BARBERFLOW_MAIL_POLL_DELAY: '3600000',
        BARBERFLOW_REQUIRE_EMAIL_VERIFICATION: 'false',
        BARBERFLOW_COOKIE_SECURE: 'false',
        BARBERFLOW_CSRF_COOKIE_SECURE: 'false',
        BARBERFLOW_RETENTION_CRON: '-',
        SPRING_PROFILES_ACTIVE: '',
      },
    },
    {
      name: 'Angular',
      command: 'pnpm start --host 127.0.0.1 --port 4200 --proxy-config proxy.e2e.conf.cjs',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
