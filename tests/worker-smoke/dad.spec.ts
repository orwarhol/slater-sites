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

	test('canonical and social URLs use Charles Slater production origin on SSR and static routes', async ({ page }) => {
		for (const path of [
			'/', '/poetry', '/novels-movies/', '/gallery',
			'/poetry/historical-perspective', '/novels-movies/cutting-in',
			'/poetry/tags/theatre/',
		]) {
			const errors = captureErrors(page);
			await gotoOk(page, `${path}?ref=preview`);
			const canonical = `https://charlesslater.com${path}`;
			await expect(page.locator('head title')).toHaveCount(1);
			await expect(page.locator('meta[name="description"]')).toHaveCount(1);
			await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
			for (const property of ['og:url', 'twitter:url']) {
				await expect(page.locator(`meta[property="${property}"]`)).toHaveCount(1);
				await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', canonical);
			}
			for (const property of ['og:image', 'twitter:image']) {
				const image = await page.locator(`meta[property="${property}"]`).getAttribute('content');
				expect(new URL(image!).origin).toBe('https://charlesslater.com');
			}
			await expectWellFormedContent(page);
			expectNoPageErrors(errors);
		}
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

	// Prerendered route: /poetry/tags/[tag] sets `export const prerender = true`,
	// so it exercises the @astrojs/cloudflare prerenderer. Guards against the
	// default 'workerd' prerenderer serializing the body as "[object Object]".
	test('prerendered poetry tag page renders well-formed content', async ({
		page,
	}) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/poetry/tags/theatre');
		await expect(page.locator('h1', { hasText: 'Tag:' })).toBeVisible();
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});
});

const decorativePoems = [
	['boxes-of-childhood-at-the-curb', 'house.png'],
	['sue-could-be-a-lion-tamer', 'marriage.png'],
	['international-sweetness', 'vanagon.png'],
	['historical-perspective', 'sand-dunes.png'],
	['working', 'carpentry.png'],
	['auditioning-shrew', 'rose.png'],
	['eureka', 'carpentry.png'],
] as const;

test.describe('dad-site decorative poetry headers', () => {
	test('renders and decodes the approved local illustrations without inline duplicates', async ({ page }) => {
		test.setTimeout(120_000);
		const errors = captureErrors(page);
		for (const [slug, filename] of decorativePoems) {
			await gotoOk(page, `/poetry/${slug}`);
			const wrapper = page.locator('.poem-header .decorative-image-wrap');
			await expect(wrapper, slug).toHaveCount(1);
			await expect(wrapper, slug).toHaveAttribute('aria-hidden', 'true');
			const image = wrapper.locator('img');
			await expect(image, slug).toHaveCount(1);
			await expect(page.locator('.poem-header img'), slug).toHaveCount(1);
			await expect(image, slug).toHaveAttribute('src', `/poetry/${filename}`);
			await expect(image, slug).toHaveAttribute('alt', '');
			const dimensions = await image.evaluate(async element => {
				const img = element as HTMLImageElement;
				await img.decode();
				return { complete: img.complete, width: img.naturalWidth, height: img.naturalHeight };
			});
			expect(dimensions.complete, slug).toBe(true);
			expect(dimensions.width, slug).toBeGreaterThan(0);
			expect(dimensions.height, slug).toBeGreaterThan(0);
			await expect(page.locator('.poem-content img'), slug).toHaveCount(0);
		}
		expectNoPageErrors(errors);
	});

	test('keeps responsive headers clear and artwork loaded in both reader modes', async ({ page }) => {
		test.setTimeout(120_000);
		const errors = captureErrors(page);
		for (const width of [1280, 390]) {
			await page.setViewportSize({ width, height: 900 });
			for (const [slug] of decorativePoems.filter(([name]) =>
				['boxes-of-childhood-at-the-curb', 'sue-could-be-a-lion-tamer', 'auditioning-shrew'].includes(name))) {
				await gotoOk(page, `/poetry/${slug}`);
				const wrapper = page.locator('.poem-header .decorative-image-wrap');
				const image = wrapper.locator('img');
				const heading = page.locator('.poem-header h1');
				const checkbox = page.locator('#dark-reader-toggle');
				for (const dark of [false, true]) {
					await checkbox.setChecked(dark);
					await expect(page.locator('[data-poetry-reader]')).toHaveClass(dark ? /is-dark/ : /^(?!.*\bis-dark\b).*$/);
					const box = await wrapper.boundingBox();
					const title = await heading.boundingBox();
					expect(box, `${slug} at ${width}px`).not.toBeNull();
					expect(title, `${slug} at ${width}px`).not.toBeNull();
					const size = width <= 600 ? 72 : 90;
					expect(box!.width, `${slug} at ${width}px`).toBe(size);
					expect(box!.height, `${slug} at ${width}px`).toBe(size);
					expect(title!.x + title!.width, `${slug} at ${width}px`).toBeLessThanOrEqual(box!.x);
					const state = await image.evaluate(element => {
						const img = element as HTMLImageElement;
						const title = document.querySelector('.poem-header h1');
						if (!title || !img.parentElement) throw new Error('Missing poem heading or image wrapper');
						const text = document.createRange();
						text.selectNodeContents(title);
						const illustration = img.parentElement.getBoundingClientRect();
						const textOverlapsImage = Array.from(text.getClientRects()).some(rect =>
							rect.right > illustration.left && rect.left < illustration.right
							&& rect.bottom > illustration.top && rect.top < illustration.bottom);
						const filters: string[] = [];
						for (let ancestor: HTMLElement | null = img; ancestor; ancestor = ancestor.parentElement) {
							const filter = getComputedStyle(ancestor).filter;
							if (filter !== 'none') filters.push(filter);
						}
						return {
							loaded: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
							objectFit: getComputedStyle(img).objectFit,
							filters,
							textOverlapsImage,
							overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth,
						};
					});
					expect(state.loaded, slug).toBe(true);
					expect(state.objectFit, slug).toBe('contain');
					expect(state.filters, slug).toEqual([]);
					expect(state.textOverlapsImage, `${slug} at ${width}px`).toBe(false);
					expect(state.overflow, `${slug} at ${width}px`).toBe(false);
				}
			}
		}
		expectNoPageErrors(errors);
	});
});
