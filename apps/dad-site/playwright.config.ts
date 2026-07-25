import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

/**
 * Playwright configuration for dad-site home-page smoke test.
 *
 * Uses the system Chromium browser when available (CI / Linux environments)
 * so no browser download is required. Falls back to Playwright's own bundled
 * browser when the system path is absent (macOS, Windows, local dev).
 *
 * Run with:  npm run test:playwright --workspace=dad-site
 */

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
	fullyParallel: false,
	retries: 0,
	workers: 1,
	timeout: 30_000,
	reporter: 'list',

	use: {
		baseURL: 'http://localhost:4325',
		launchOptions: {
			...(executablePath ? { executablePath } : {}),
			args: ['--no-sandbox', '--disable-dev-shm-usage'],
		},
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	webServer: {
		command: 'npm run dev -- --port 4325',
		url: 'http://localhost:4325',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		cwd: '.',
	},
});
