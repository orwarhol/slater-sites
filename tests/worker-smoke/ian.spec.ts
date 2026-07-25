import { test, expect } from '@playwright/test';
import {
	captureErrors,
	expectNoPageErrors,
	expectWellFormedContent,
	gotoOk,
} from './helpers';

/**
 * Built-Worker smoke tests for ian-site.
 *
 * These run against the *production build* served through the generated
 * Cloudflare Worker (wrangler dev), not the Astro dev server. They exist to
 * catch regressions that only manifest in the built/deployed output — most
 * notably the `[object Object]` prerender defect that a dev-only smoke missed.
 */

test.describe('ian-site built worker', () => {
	test('homepage renders well-formed primary content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/');

		await expect(page.locator('h1', { hasText: 'Ian Slater' })).toBeVisible();
		// Recognizable biography content.
		await expect(page.locator('body')).toContainText('Ian Charles Slater');
		// Latest-project section is present when project content exists.
		const latest = page.locator('.featured-project');
		await expect(latest).toBeVisible();
		// The featured project must have a real, human-readable title (not empty
		// and not a malformed object serialization).
		const projectTitle = (
			await latest.locator('.project-title').innerText()
		).trim();
		expect(projectTitle.length).toBeGreaterThan(0);
		expect(projectTitle).not.toContain('[object Object]');
		// Intended navigation + footer.
		await expect(page.locator('header')).toBeVisible();
		await expect(page.locator('footer')).toBeVisible();

		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});

	test('projects listing renders well-formed content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/projects/');
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});
});
