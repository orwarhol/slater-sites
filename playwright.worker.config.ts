import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Built-Worker Playwright configuration.
 *
 * Serves each app's *production build* through its generated Cloudflare Worker
 * (`wrangler dev` against `dist/server/wrangler.json`) and runs browser smoke
 * tests against it. This is deliberately separate from each app's dev-server
 * Playwright config so that the built/deployed output is exercised — a dev-only
 * smoke previously passed while the deployed homepage rendered `[object Object]`.
 *
 * A fresh production build for all three apps is expected to have run before
 * this config starts (see the `test:worker` script in package.json).
 *
 * Run with:  npm run test:worker
 */

const SYSTEM_CHROMIUM_PATHS = [
	'/usr/bin/chromium-browser',
	'/usr/bin/chromium',
	'/usr/bin/google-chrome',
];

const executablePath = SYSTEM_CHROMIUM_PATHS.find(existsSync);

const GLOBAL_PORT = 8791;
const DAD_PORT = 8792;
const IAN_PORT = 8793;

function workerServer(app: string, port: number) {
	return {
		command: `npx wrangler dev --config dist/server/wrangler.json --port ${port} --ip 127.0.0.1`,
		cwd: `apps/${app}`,
		url: `http://127.0.0.1:${port}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	};
}

export default defineConfig({
	testDir: './tests/worker-smoke',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: 1,
	timeout: 30_000,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/worker' }]],

	use: {
		launchOptions: {
			...(executablePath ? { executablePath } : {}),
			args: ['--no-sandbox', '--disable-dev-shm-usage'],
		},
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},

	webServer: [
		workerServer('global-field-guide', GLOBAL_PORT),
		workerServer('dad-site', DAD_PORT),
		workerServer('ian-site', IAN_PORT),
	],

	projects: [
		{
			name: 'global-field-guide',
			testMatch: /global\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${GLOBAL_PORT}` },
		},
		{
			name: 'dad-site',
			testMatch: /dad\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${DAD_PORT}` },
		},
		{
			name: 'ian-site',
			testMatch: /ian\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${IAN_PORT}` },
		},
	],
});
