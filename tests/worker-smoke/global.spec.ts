import { test, expect } from '@playwright/test';
import {
	captureErrors,
	expectNoPageErrors,
	expectWellFormedContent,
	gotoOk,
} from './helpers';

/**
 * Built-Worker smoke tests for global-field-guide (server output).
 *
 * Runs against the production build served through the generated Cloudflare
 * Worker (wrangler dev), exercising the homepage, a localized landing page,
 * and a representative guide route.
 */

test.describe('global-field-guide built worker', () => {
	test('homepage renders well-formed content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/');

		await expect(
			page.locator('h1', { hasText: 'Global Field Guide' }),
		).toBeVisible();
		// Locale navigation landmark linking into a regional landing page.
		await expect(page.locator('a[href="/en-us/"]').first()).toBeVisible();

		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});

	test('localized landing page renders well-formed content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/en-us/');
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});

	test('representative guide route renders well-formed content', async ({
		page,
	}) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/en-us/guides/morning-market-walk');
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});
});
