import { test, expect } from '@playwright/test';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
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

	const publicPaths = [
		'/',
		'/blog/',
		'/projects/',
		'/gallery/',
		'/blog/hello-world-again/',
		'/blog/beyond-the-branching-path---building-narrative-game-engines-in-openclaw/',
		'/projects/hattie/',
		'/projects/alyssa-craft/',
		'/projects/dark-love/',
	];
	const origin = 'https://iancharlesslater.com';

	test.describe('ian-site native metadata and discovery', () => {
		for (const path of [...publicPaths, '/resume/']) {
			test(`${path} has one consistent, production-origin head`, async ({ page, request }) => {
				const errors = captureErrors(page);
				await gotoOk(page, `${path}?ref=preview&i=2`);
				const head = page.locator('head');
				await expect(head.locator('title')).toHaveCount(1);
				await expect(head.locator('meta[name="description"]')).toHaveCount(1);
				await expect(head.locator('link[rel="canonical"]')).toHaveCount(1);
				await expect(head.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}${path}`);
				const title = await page.title();
				const description = await head.locator('meta[name="description"]').getAttribute('content');
				expect(title).not.toContain('[object Object]');
				expect(description?.length).toBeGreaterThan(0);
				for (const [key, value] of Object.entries({
					'title': title,
					'og:type': 'website',
					'og:url': `${origin}${path}`,
					'og:title': title,
					'og:description': description!,
					'twitter:card': 'summary_large_image',
					'twitter:url': `${origin}${path}`,
					'twitter:title': title,
					'twitter:description': description!,
				})) {
					const tag = head.locator(`meta[name="${key}"], meta[property="${key}"]`);
					await expect(tag).toHaveCount(1);
					await expect(tag).toHaveAttribute('content', value);
				}
				const imageTag = head.locator('meta[property="og:image"]');
				await expect(imageTag).toHaveCount(1);
				const image = new URL((await imageTag.getAttribute('content'))!);
				expect(image.origin).toBe(origin);
				const twitterImage = head.locator('meta[name="twitter:image"]');
				await expect(twitterImage).toHaveCount(1);
				await expect(twitterImage).toHaveAttribute('content', image.href);
				const asset = await request.get(image.pathname);
				expect(asset.status()).toBe(200);
				expect(asset.headers()['content-type']).toMatch(/^image\//);
				await expect(head.locator('link[rel="sitemap"]')).toHaveCount(1);
				await expect(head.locator('link[rel="sitemap"]')).toHaveAttribute('href', '/sitemap-index.xml');
				const feed = head.locator('link[rel="alternate"][type="application/rss+xml"]');
				await expect(feed).toHaveCount(1);
				await expect(feed).toHaveAttribute('href', `${origin}/rss.xml`);
				await expect(feed).toHaveAttribute('title', 'Ian Slater');
				expectNoPageErrors(errors);
			});
		}

		test('generated sitemap index and all children are served and contain only canonical public pages', async ({ request, page }) => {
			const robots = await request.get('/robots.txt');
			expect(robots.status()).toBe(200);
			expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap-index.xml`);
			const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'sitemap' || name === 'url' });
			const response = await request.get('/sitemap-index.xml');
			expect(response.status()).toBe(200);
			expect(response.headers()['content-type']).toContain('xml');
			const xml = await response.text();
			expect(XMLValidator.validate(xml)).toBe(true);
			const index = parser.parse(xml) as { sitemapindex: { '@_xmlns': string; sitemap: Array<{ loc: string }> } };
			expect(index.sitemapindex['@_xmlns']).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
			expect(index.sitemapindex.sitemap.length).toBeGreaterThan(0);
			const urls: string[] = [];
			for (const child of index.sitemapindex.sitemap) {
				const url = new URL(child.loc);
				expect(url.origin).toBe(origin);
				const response = await request.get(url.pathname);
				expect(response.status()).toBe(200);
				expect(response.headers()['content-type']).toContain('xml');
				const xml = await response.text();
				expect(XMLValidator.validate(xml)).toBe(true);
				const parsed = parser.parse(xml) as { urlset: { '@_xmlns': string; url: Array<{ loc: string; lastmod?: string }> } };
				expect(parsed.urlset['@_xmlns']).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
				for (const entry of parsed.urlset.url) {
					expect(entry.lastmod).toBeUndefined();
					urls.push(entry.loc);
				}
			}
			expect(new Set(urls).size).toBe(urls.length);
			expect(urls).toEqual(expect.arrayContaining(publicPaths.map(path => `${origin}${path}`)));
			for (const url of urls) {
				const parsed = new URL(url);
				expect(parsed.origin).toBe(origin);
				expect(parsed.search).toBe('');
				expect(parsed.hash).toBe('');
				expect(parsed.pathname).not.toMatch(/\/(?:resume|feed|photography|_drafts|api|404|500)(?:\/|$)|\.xml$/);
				const response = await page.goto(parsed.pathname);
				expect(response?.status()).toBe(200);
				expect(response?.headers()['content-type']).toContain('text/html');
				await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
				await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
			}
		});

		test('legacy XML/feed URLs redirect once through the Worker with query preservation', async ({ request }) => {
			const parser = new XMLParser({ ignoreAttributes: false });
			for (const [from, to] of [
				['/sitemap.xml', '/sitemap-index.xml'],
				['/feed', '/rss.xml'],
				['/feed/', '/rss.xml'],
			]) {
				for (const query of ['', '?ref=abc']) {
					const response = await request.get(from + query, { maxRedirects: 0 });
					expect(response.status()).toBe(301);
					expect(response.headers().location).toBe(to + query);
					const target = await request.get(response.headers().location, { maxRedirects: 0 });
					expect(target.status()).toBe(200);
					const xml = await target.text();
					expect(XMLValidator.validate(xml)).toBe(true);
					if (to === '/rss.xml') {
						expect(target.headers()['content-type']).toBe('application/rss+xml; charset=utf-8');
						expect(parser.parse(xml)).toEqual(parser.parse(await (await request.get('/rss.xml')).text()));
					}
				}
			}
			const photography = await request.get('/photography?ref=abc', { maxRedirects: 0 });
			expect(photography.status()).toBe(301);
			expect(photography.headers().location).toBe('/gallery?ref=abc');
		});

		test('gallery keyboard navigation and resume controls remain interactive', async ({ page }) => {
			const errors = captureErrors(page);
			await gotoOk(page, '/gallery/?i=1');
			const image = page.locator('#mainImage');
			const first = await image.getAttribute('src');
			await page.keyboard.press('ArrowRight');
			await expect(image).not.toHaveAttribute('src', first!);
			await page.keyboard.press('ArrowLeft');
			await expect(image).toHaveAttribute('src', first!);
			await gotoOk(page, '/resume');
			await expect(page.locator('#deck-dots button.is-active')).toHaveCount(1);
			await page.click('#next-btn');
			await expect(page.locator('#deck-dots button').nth(1)).toHaveAttribute('aria-pressed', 'true');
			await page.locator('#deck-stage').focus();
			await page.keyboard.press('ArrowLeft');
			await expect(page.locator('#deck-dots button').first()).toHaveAttribute('aria-pressed', 'true');
			expectNoPageErrors(errors);
		});
	});

	test('projects listing renders well-formed content', async ({ page }) => {
		const errors = captureErrors(page);
		await gotoOk(page, '/projects/');
		await expectWellFormedContent(page);
		expectNoPageErrors(errors);
	});
});
