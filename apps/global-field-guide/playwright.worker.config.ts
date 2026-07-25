import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

const SYSTEM_CHROMIUM_PATHS = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
];

function resolveChromiumPath(): string | undefined {
  return SYSTEM_CHROMIUM_PATHS.find(existsSync);
}

const executablePath = resolveChromiumPath();

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: /cloudflare-worker-smoke\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4326',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  }],
  webServer: {
    command: 'npm run build && npx wrangler dev --ip 127.0.0.1 --port 4326 --local',
    url: 'http://127.0.0.1:4326',
    reuseExistingServer: !process.env.CI,
    timeout: 900_000,
    cwd: '.',
  },
});
