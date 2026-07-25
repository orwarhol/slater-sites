/**
 * Home-page smoke test for ian-site.
 *
 * Boots the real Astro dev server via the shared Playwright webServer, loads
 * the `/` route, and verifies the page reaches a loaded state and renders
 * intentional site content (site-specific H1). Fails on uncaught page errors
 * and on browser console errors that would indicate broken loading, hydration,
 * imports, routing, or asset delivery.
 *
 * Complements the resume-specific interactive tests.
 */

import { test, expect, type ConsoleMessage } from '@playwright/test';

test.describe('ian-site home page smoke', () => {
	test('home page renders site H1 and produces no fatal browser errors', async ({ page }) => {
		const pageErrors: Error[] = [];
		const consoleErrors: string[] = [];

		page.on('pageerror', (err) => {
			pageErrors.push(err);
		});

		page.on('console', (msg: ConsoleMessage) => {
			if (msg.type() === 'error') {
				const text = msg.text();
				// Ignore harmless dev-server / third-party noise (favicon 404, HMR probe,
				// analytics blockers). Fail on anything that suggests broken loading,
				// hydration, imports, routing, or asset delivery.
				if (/favicon|net::ERR_ABORTED.*(analytics|hotjar|beacon)/i.test(text)) return;
				consoleErrors.push(text);
			}
		});

		const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(response, 'main document response').not.toBeNull();
		expect(response!.status(), 'main document HTTP status').toBe(200);

		// Wait for the site-specific H1 to be visible — a stable landmark that only
		// exists when the real home page renders, not a blank shell or fallback.
		await expect(
			page.getByRole('heading', { level: 1, name: 'Ian Slater' }),
		).toBeVisible();

		// Site chrome from Header.astro / Footer.astro (present on all pages).
		await expect(page.locator('footer')).toBeVisible();

		expect(pageErrors, 'uncaught page errors on home page').toEqual([]);
		expect(consoleErrors, 'browser console errors on home page').toEqual([]);
	});
});
