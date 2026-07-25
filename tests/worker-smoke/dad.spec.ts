import { test, expect } from '@playwright/test';
import {
	captureErrors,
	expectNoPageErrors,
	expectWellFormedContent,
	gotoOk,
} from './helpers';

/**
 * Built-Worker smoke tests for dad-site (server output).
 *
 * Runs against the production build served through the generated Cloudflare
 * Worker (wrangler dev), exercising representative poetry and novels/movies
 * routes affected by the Astro 7 migration.
 */

test.describe('dad-site built worker', () => {
	test('homepage renders well-formed content with primary navigation', async ({
		page,
	}) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/');

		await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible();
		await expect(page.locator('body')).toContainText('Charles Slater');
		// Site chrome + primary navigation.
		await expect(page.locator('header nav')).toBeVisible();
		await expect(page.locator('a[href="/poetry"]').first()).toBeVisible();
		await expect(
			page.locator('a[href="/novels-movies"]').first(),
		).toBeVisible();

		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});

	test('poetry listing renders well-formed content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/poetry');
		await expect(page.locator('h1', { hasText: 'Poetry' })).toBeVisible();
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});

	test('novels-movies listing renders well-formed content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/novels-movies/');
		await expect(
			page.locator('h1', { hasText: 'Novels and Movies' }),
		).toBeVisible();
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});
});
