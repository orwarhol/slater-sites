/**
 * Home-page smoke test for dad-site.
 *
 * Boots the real Astro dev server via the shared Playwright webServer, loads
 * the `/` route, and verifies the page reaches a loaded state and renders
 * intentional site content (site-specific H1). Fails on uncaught page errors
 * and on browser console errors that would indicate broken loading, hydration,
 * imports, routing, or asset delivery.
 */

import { test, expect, type ConsoleMessage } from '@playwright/test';

test.describe('dad-site home page smoke', () => {
	test('home page renders "Welcome" H1 and produces no fatal browser errors', async ({ page }) => {
		const pageErrors: Error[] = [];
		const consoleErrors: string[] = [];

		page.on('pageerror', (err) => {
			pageErrors.push(err);
		});

		page.on('console', (msg: ConsoleMessage) => {
			if (msg.type() === 'error') {
				const text = msg.text();
				if (/favicon|net::ERR_ABORTED.*(analytics|hotjar|beacon)/i.test(text)) return;
				consoleErrors.push(text);
			}
		});

		const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(response, 'main document response').not.toBeNull();
		expect(response!.status(), 'main document HTTP status').toBe(200);

		// dad-site index has <h1>Welcome</h1>; the site logo H1 uses site-brand class.
		await expect(
			page.locator('main h1', { hasText: 'Welcome' }),
		).toBeVisible();

		// Site chrome (Header + Footer) is present on all pages.
		await expect(page.locator('header').first()).toBeVisible();
		await expect(page.locator('footer').first()).toBeVisible();

		expect(pageErrors, 'uncaught page errors on home page').toEqual([]);
		expect(consoleErrors, 'browser console errors on home page').toEqual([]);
	});
});
