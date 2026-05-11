/**
 * Playwright tests for the /resume presentation page in ian-site.
 *
 * Covers interactive and visual behaviour that cannot be verified via HTTP
 * requests alone:
 *   - Active dot corresponds to the current slide
 *   - Navigation (Next, Prev, dot-click, keyboard) updates the active dot
 *   - LinkedIn CTAs carry target="_blank" and rel="noopener noreferrer"
 *   - Slide 1 and Slide 2 eyebrow alignment is not indented vs slide content
 *   - Slides 3, 4, and 5 eyebrow styling is consistent
 *
 * Run with:  npm run test:playwright --workspace=ian-site
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the index (0-based) of the currently active dot button. */
async function getActiveDotIndex(page: import('@playwright/test').Page): Promise<number> {
	const dots = page.locator('#deck-dots button.deck-dots__dot');
	const count = await dots.count();
	for (let i = 0; i < count; i++) {
		const cls = await dots.nth(i).getAttribute('class') ?? '';
		if (cls.includes('is-active')) return i;
	}
	return -1;
}

/** Returns the aria-pressed value for the dot at the given index. */
async function getDotAriaPressed(
	page: import('@playwright/test').Page,
	index: number,
): Promise<string | null> {
	return page
		.locator('#deck-dots button.deck-dots__dot')
		.nth(index)
		.getAttribute('aria-pressed');
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
	await page.goto('/resume');
	// Wait for the deck to be initialised (first dot becomes active).
	await expect(page.locator('#deck-dots button.is-active').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Helpers (post-beforeEach)
// ---------------------------------------------------------------------------

/** Wait for a specific dot index to become the active dot. */
async function waitForActiveDot(
	page: import('@playwright/test').Page,
	index: number,
): Promise<void> {
	await expect(
		page.locator('#deck-dots button.deck-dots__dot').nth(index),
	).toHaveClass(/is-active/);
}

// ---------------------------------------------------------------------------
// Active dot — initial state
// ---------------------------------------------------------------------------

test.describe('Active dot — initial state', () => {
	test('first dot is active on page load', async ({ page }) => {
		expect(await getActiveDotIndex(page)).toBe(0);
	});

	test('only one dot is active on page load', async ({ page }) => {
		const activeDots = await page.locator('#deck-dots button.is-active').count();
		expect(activeDots).toBe(1);
	});

	test('first dot has aria-pressed="true"', async ({ page }) => {
		expect(await getDotAriaPressed(page, 0)).toBe('true');
	});

	test('other dots have aria-pressed="false"', async ({ page }) => {
		const dots = page.locator('#deck-dots button.deck-dots__dot');
		const count = await dots.count();
		for (let i = 1; i < count; i++) {
			expect(await dots.nth(i).getAttribute('aria-pressed')).toBe('false');
		}
	});

	test('first dot aria-label contains "(current)"', async ({ page }) => {
		const label = await page
			.locator('#deck-dots button.deck-dots__dot')
			.first()
			.getAttribute('aria-label');
		expect(label).toMatch(/\(current\)/);
	});

	test('active dot has a visible cyan background', async ({ page }) => {
		const dot = page.locator('#deck-dots button.is-active').first();
		const bg = await dot.evaluate((el) => getComputedStyle(el).backgroundImage);
		// Active dot uses a CSS gradient; confirm it's not 'none' / transparent.
		expect(bg).not.toBe('none');
	});
});

// ---------------------------------------------------------------------------
// Active dot — Next button
// ---------------------------------------------------------------------------

test.describe('Active dot — Next button navigation', () => {
	test('clicking Next moves active dot to second position', async ({ page }) => {
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);
		expect(await getActiveDotIndex(page)).toBe(1);
	});

	test('clicking Next twice moves active dot to third position', async ({ page }) => {
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);
		await page.click('#next-btn');
		await waitForActiveDot(page, 2);
		expect(await getActiveDotIndex(page)).toBe(2);
	});

	test('new active dot has aria-pressed="true"', async ({ page }) => {
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);
		expect(await getDotAriaPressed(page, 1)).toBe('true');
	});

	test('previous dot loses aria-pressed after Next', async ({ page }) => {
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);
		expect(await getDotAriaPressed(page, 0)).toBe('false');
	});
});

// ---------------------------------------------------------------------------
// Active dot — Prev button
// ---------------------------------------------------------------------------

test.describe('Active dot — Prev button navigation', () => {
	test('clicking Next then Prev returns to first dot', async ({ page }) => {
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);
		await page.click('#prev-btn');
		await waitForActiveDot(page, 0);
		expect(await getActiveDotIndex(page)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Active dot — Dot click navigation
// ---------------------------------------------------------------------------

test.describe('Active dot — dot-click navigation', () => {
	test('clicking the third dot makes it active', async ({ page }) => {
		const dots = page.locator('#deck-dots button.deck-dots__dot');
		// force:true bypasses the Astro dev toolbar overlay in dev mode.
		await dots.nth(2).click({ force: true });
		await waitForActiveDot(page, 2);
		expect(await getActiveDotIndex(page)).toBe(2);
	});

	test('clicking the last dot makes it active', async ({ page }) => {
		const dots = page.locator('#deck-dots button.deck-dots__dot');
		const count = await dots.count();
		await dots.nth(count - 1).click({ force: true });
		await waitForActiveDot(page, count - 1);
		expect(await getActiveDotIndex(page)).toBe(count - 1);
	});

	test('clicking a dot updates the corresponding slide to active', async ({ page }) => {
		await page.locator('#deck-dots button.deck-dots__dot').nth(2).click({ force: true });
		await waitForActiveDot(page, 2);
		const activeSlides = await page.locator('.deck-slide.is-active').count();
		expect(activeSlides).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Active dot — Keyboard navigation
// ---------------------------------------------------------------------------

test.describe('Active dot — keyboard navigation', () => {
	test('ArrowRight moves active dot forward', async ({ page }) => {
		// Focus the stage so keyboard events aren't consumed by a focusable element.
		await page.locator('#deck-stage').focus();
		await page.keyboard.press('ArrowRight');
		await waitForActiveDot(page, 1);
		expect(await getActiveDotIndex(page)).toBe(1);
	});

	test('ArrowLeft moves active dot backward', async ({ page }) => {
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);
		await page.locator('#deck-stage').focus();
		await page.keyboard.press('ArrowLeft');
		await waitForActiveDot(page, 0);
		expect(await getActiveDotIndex(page)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// LinkedIn CTAs
// ---------------------------------------------------------------------------

test.describe('LinkedIn CTAs', () => {
	test('Slide 1 LinkedIn link opens in a new tab', async ({ page }) => {
		// Navigate to slide 1 (already there on load).
		const link = page
			.locator('[data-slide-id="opening"] a[href*="linkedin"]')
			.first();
		await expect(link).toHaveAttribute('target', '_blank');
	});

	test('Slide 1 LinkedIn link has rel="noopener noreferrer"', async ({ page }) => {
		const link = page
			.locator('[data-slide-id="opening"] a[href*="linkedin"]')
			.first();
		const rel = await link.getAttribute('rel');
		expect(rel).toContain('noopener');
		expect(rel).toContain('noreferrer');
	});

	test('Slide 7 LinkedIn link opens in a new tab', async ({ page }) => {
		// Navigate to the last slide via Next button (avoids dev toolbar overlay).
		const total = await page.locator('#deck-dots button.deck-dots__dot').count();
		for (let i = 1; i < total; i++) {
			await page.click('#next-btn');
			await waitForActiveDot(page, i);
		}

		const link = page
			.locator('[data-slide-id="close"] a[href*="linkedin"]')
			.first();
		await expect(link).toHaveAttribute('target', '_blank');
	});

	test('Slide 7 LinkedIn link has rel="noopener noreferrer"', async ({ page }) => {
		const total = await page.locator('#deck-dots button.deck-dots__dot').count();
		for (let i = 1; i < total; i++) {
			await page.click('#next-btn');
			await waitForActiveDot(page, i);
		}

		const link = page
			.locator('[data-slide-id="close"] a[href*="linkedin"]')
			.first();
		const rel = await link.getAttribute('rel');
		expect(rel).toContain('noopener');
		expect(rel).toContain('noreferrer');
	});

	test('LinkedIn buttons retain their CTA appearance (bordered button style)', async ({ page }) => {
		const link = page
			.locator('[data-slide-id="opening"] a[href*="linkedin"]')
			.first();
		const border = await link.evaluate((el) => getComputedStyle(el).border);
		// Expects a visible border (not "0px none …" or empty).
		expect(border).not.toMatch(/^0px/);
	});
});

// ---------------------------------------------------------------------------
// Eyebrow alignment — Slides 1 & 2
// ---------------------------------------------------------------------------

test.describe('Eyebrow alignment', () => {
	test('Slide 1 eyebrow is inside .slide-content (same container as body text)', async ({ page }) => {
		const eyebrow = page.locator(
			'[data-slide-id="opening"] .slide-content .slide-eyebrow',
		);
		await expect(eyebrow).toHaveCount(1);
	});

	test('Slide 2 eyebrow is inside .slide-content', async ({ page }) => {
		const eyebrow = page.locator(
			'[data-slide-id="thesis"] .slide-content .slide-eyebrow',
		);
		await expect(eyebrow).toHaveCount(1);
	});

	test('Slide 1 eyebrow left edge aligns with slide content', async ({ page }) => {
		const eyebrow = page.locator(
			'[data-slide-id="opening"] .slide-content .slide-eyebrow',
		);
		const content = page.locator('[data-slide-id="opening"] .slide-content h1');
		const eyebrowBox = await eyebrow.boundingBox();
		const contentBox = await content.boundingBox();
		expect(eyebrowBox).not.toBeNull();
		expect(contentBox).not.toBeNull();
		// Left edges should be within 2px of each other.
		expect(Math.abs(eyebrowBox!.x - contentBox!.x)).toBeLessThan(2);
	});

	test('Slide 2 eyebrow left edge aligns with slide content', async ({ page }) => {
		// Navigate to slide 2.
		await page.click('#next-btn');
		await waitForActiveDot(page, 1);

		const eyebrow = page.locator(
			'[data-slide-id="thesis"] .slide-content .slide-eyebrow',
		);
		const content = page.locator('[data-slide-id="thesis"] .slide-content h2');
		const eyebrowBox = await eyebrow.boundingBox();
		const contentBox = await content.boundingBox();
		expect(eyebrowBox).not.toBeNull();
		expect(contentBox).not.toBeNull();
		expect(Math.abs(eyebrowBox!.x - contentBox!.x)).toBeLessThan(2);
	});
});

// ---------------------------------------------------------------------------
// Eyebrow styling consistency — Slides 3, 4, 5
// ---------------------------------------------------------------------------

test.describe('Eyebrow styling consistency — Slides 3, 4, 5', () => {
	async function getEyebrowStyles(page: import('@playwright/test').Page, slideId: string) {
		const el = page.locator(`[data-slide-id="${slideId}"] .slide-content .slide-eyebrow`);
		return el.evaluate((node) => {
			const s = getComputedStyle(node);
			return {
				fontSize: s.fontSize,
				fontWeight: s.fontWeight,
				letterSpacing: s.letterSpacing,
				textTransform: s.textTransform,
				color: s.color,
			};
		});
	}

	test('Slides 3, 4, and 5 eyebrows have identical computed styles', async ({ page }) => {
		const [s3, s4, s5] = await Promise.all([
			getEyebrowStyles(page, 'platform'),
			getEyebrowStyles(page, 'distribution'),
			getEyebrowStyles(page, 'governance'),
		]);

		expect(s4).toEqual(s3);
		expect(s5).toEqual(s3);
	});

	test('Slide 3 eyebrow is inside .slide-content', async ({ page }) => {
		await expect(
			page.locator('[data-slide-id="platform"] .slide-content .slide-eyebrow'),
		).toHaveCount(1);
	});

	test('Slide 4 eyebrow is inside .slide-content', async ({ page }) => {
		await expect(
			page.locator('[data-slide-id="distribution"] .slide-content .slide-eyebrow'),
		).toHaveCount(1);
	});

	test('Slide 5 eyebrow is inside .slide-content', async ({ page }) => {
		await expect(
			page.locator('[data-slide-id="governance"] .slide-content .slide-eyebrow'),
		).toHaveCount(1);
	});
});
