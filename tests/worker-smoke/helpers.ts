import { expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * Visible-text serialization defects that indicate a broken render.
 *
 * These are matched against the page's *rendered* text (body.innerText), not the
 * raw HTML source, so that legitimate occurrences of the word "undefined" inside
 * inline scripts or technical prose do not cause false failures.
 */
const MALFORMED_TOKENS = ['[object Object]', '[object Promise]', 'undefined'];

export type CapturedErrors = {
	pageErrors: string[];
	consoleErrors: string[];
};

/**
 * Attaches listeners that capture uncaught page exceptions and console errors.
 * Returns the mutable buffers so a test can assert on them after navigation.
 */
export function captureErrors(page: Page): CapturedErrors {
	const captured: CapturedErrors = { pageErrors: [], consoleErrors: [] };
	page.on('pageerror', (err) => captured.pageErrors.push(err.message));
	page.on('console', (msg: ConsoleMessage) => {
		if (msg.type() !== 'error') return;
		const location = msg.location();
		const url = location?.url ?? '';
		// Browsers auto-request /favicon.ico when a page does not declare a
		// <link rel="icon"> for that path. That request is initiated by the
		// browser, not by the page code, and its 404 is not a production-side
		// application failure. Ignore only this specific well-known case so
		// real console errors still fail the suite.
		if (/\/favicon\.ico(\?|$)/.test(url)) return;
		const suffix = url ? ` (${url})` : '';
		captured.consoleErrors.push(`${msg.text()}${suffix}`);
	});
	return captured;
}

/**
 * Asserts the primary rendered content is well-formed:
 * - no malformed serialization tokens in the visible text,
 * - a non-trivial amount of visible text (not a blank page / empty shell).
 */
export async function expectWellFormedContent(page: Page): Promise<void> {
	const bodyText = (await page.locator('body').innerText()).trim();

	// Not a blank page or empty shell.
	expect(bodyText.length, 'page has visible text content').toBeGreaterThan(50);

	for (const token of MALFORMED_TOKENS) {
		expect(
			bodyText,
			`visible page text must not contain "${token}"`,
		).not.toContain(token);
	}

	// Framework error pages / stack traces should never reach the browser.
	expect(bodyText).not.toContain('Internal Server Error');
	expect(bodyText).not.toMatch(/\bat\s+\S+\s+\(.*:\d+:\d+\)/); // stack frame
}

/**
 * Navigates to a path, asserts a successful response, and returns the response.
 */
export async function gotoOk(page: Page, path: string) {
	const response = await page.goto(path, { waitUntil: 'networkidle' });
	expect(response, `navigation to ${path} returned a response`).not.toBeNull();
	expect(
		response!.status(),
		`GET ${path} should return a success status`,
	).toBeLessThan(400);
	return response!;
}

/** Fails the test if any uncaught page exceptions or console errors were captured. */
export function expectNoPageErrors(captured: CapturedErrors): void {
	expect(
		captured.pageErrors,
		`uncaught page errors: ${captured.pageErrors.join(' | ')}`,
	).toEqual([]);
	expect(
		captured.consoleErrors,
		`console errors: ${captured.consoleErrors.join(' | ')}`,
	).toEqual([]);
}
