/**
 * Integration tests for the Cloudflare Stream video presentation used by poetry
 * and novels entries whose frontmatter supplies `videoUrl`.
 *
 * Writes two uniquely named, test-only entries into the real content
 * directories (never overwriting an existing file), starts the dev server,
 * then removes the entries in afterAll. Integration files run one at a time
 * (`--maxWorkers=1`), so suites that scan every poem never see these entries.
 *
 * Browser checks use Playwright with the system Chromium when available (as in
 * the repository's Playwright configs) and fulfil every Stream request with a
 * synthetic player page, so no real network, account or playback is involved.
 *
 * Run with:  npm run test:integration --workspace=dad-site
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { ELEMENT_NODE, TEXT_NODE, parse, walkSync, type ElementNode, type Node } from 'ultrahtml';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const POETRY_DIR = join(APP_ROOT, 'src/content/poetry');
const NOVELS_DIR = join(APP_ROOT, 'src/content/novels');
const FIXTURE_PREFIX = 'video-presentation-fixture-';
const SUFFIX = `${process.pid}-${randomBytes(4).toString('hex')}`;

const STREAM_URL =
	'https://customer-c123v39c6391mh3k.cloudflarestream.com/c540a969fb9588fa5cce2779d3fb54c3/iframe?poster=https%3A%2F%2Fcustomer-c123v39c6391mh3k.cloudflarestream.com%2Fc540a969fb9588fa5cce2779d3fb54c3%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600';

const POEM = {
	slug: `${FIXTURE_PREFIX}poem-${SUFFIX}`,
	title: `Video Fixture Poem ${SUFFIX}`,
	excerpt: `Video fixture poem excerpt ${SUFFIX}.`,
	videoUrl: STREAM_URL,
};
const NOVEL = {
	slug: `${FIXTURE_PREFIX}novel-${SUFFIX}`,
	title: `Video Fixture Novel ${SUFFIX}`,
	synopsis: `Video fixture synopsis ${SUFFIX} stays out of the video article.`,
	purchaseLabel: `Fixture Purchase ${SUFFIX}`,
	coverAlt: `Fixture cover ${SUFFIX}`,
	// Extra player parameter proves the query string (and its "&") is preserved.
	videoUrl: `${STREAM_URL}&letterboxColor=transparent`,
};

const FIXTURES = [
	{
		path: join(POETRY_DIR, `${POEM.slug}.md`),
		source: `---
title: "${POEM.title}"
date: 2022-11-20
tags: ["family", "memory"]
excerpt: "${POEM.excerpt}"
decorativeImage: "memory"
videoUrl: "${POEM.videoUrl}"
---

A **celebration** of life with a [fixture link](/gallery) and *emphasis*.

## Fixture program

- First fixture item
- Second fixture item
`,
	},
	{
		path: join(NOVELS_DIR, `${NOVEL.slug}.md`),
		source: `---
title: "${NOVEL.title}"
publicationDate: 2015-10-30
printLength: 306
synopsis: "${NOVEL.synopsis}"
purchaseLinks:
  - label: "${NOVEL.purchaseLabel}"
    url: "https://example.com/fixture-purchase"
coverImage: "/cutting-in-cover-shelley-slater-2015_web.jpg"
coverImageAlt: "${NOVEL.coverAlt}"
videoUrl: "${NOVEL.videoUrl}"
---

   
`,
	},
];

const created: string[] = [];

function removeFixtures() {
	while (created.length) rmSync(created.pop()!, { force: true });
}

let server: ChildProcess | undefined;
let base: string;

async function availablePort(): Promise<number> {
	const listener = createServer();
	await new Promise<void>((resolve, reject) => {
		listener.once('error', reject).listen(0, '127.0.0.1', resolve);
	});
	const address = listener.address();
	if (!address || typeof address === 'string') throw new Error('Could not reserve a port');
	await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
	return address.port;
}

async function waitForServer(timeoutMs = 60_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (server?.exitCode !== null) throw new Error(`Dev server exited with status ${server?.exitCode}`);
		try {
			await fetch(`${base}/`, { signal: AbortSignal.timeout(5_000) });
			return;
		} catch {
			await new Promise(resolve => setTimeout(resolve, 400));
		}
	}
	throw new Error('Dad-site dev server did not become ready');
}

function stopServer() {
	if (!server?.pid) return;
	try {
		process.kill(-server.pid, 'SIGTERM');
	} catch {
		server.kill('SIGTERM');
	}
	server = undefined;
}

beforeAll(async () => {
	process.once('exit', removeFixtures);
	try {
		const stale = [POETRY_DIR, NOVELS_DIR].flatMap(dir =>
			readdirSync(dir).filter(name => name.startsWith(FIXTURE_PREFIX)).map(name => join(dir, name)));
		if (stale.length) throw new Error(`Remove stale test fixtures before running: ${stale.join(', ')}`);
		for (const { path, source } of FIXTURES) {
			writeFileSync(path, source, { flag: 'wx' });
			created.push(path);
		}
		const port = await availablePort();
		base = `http://127.0.0.1:${port}`;
		server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
			cwd: APP_ROOT,
			stdio: 'ignore',
			detached: true,
			env: { ...process.env, NO_COLOR: '1', BROWSER: 'none' },
		});
		server.unref();
		await waitForServer();
	} catch (error) {
		stopServer();
		removeFixtures();
		throw error;
	}
}, 120_000);

afterAll(() => {
	try {
		stopServer();
	} finally {
		removeFixtures();
		process.removeListener('exit', removeFixtures);
	}
	for (const { path } of FIXTURES) expect(existsSync(path), path).toBe(false);
});

// ---------------------------------------------------------------------------
// Server-rendered HTML
// ---------------------------------------------------------------------------

function hasClass(node: ElementNode, className: string) {
	return node.attributes.class?.split(/\s+/).includes(className) ?? false;
}

function find(root: Node, test: (node: ElementNode) => boolean): ElementNode[] {
	const found: ElementNode[] = [];
	walkSync(root, node => {
		if (node.type === ELEMENT_NODE && test(node)) found.push(node);
	});
	return found;
}

const byName = (root: Node, name: string, className?: string) =>
	find(root, node => node.name === name && (!className || hasClass(node, className)));
const byClass = (root: Node, className: string) => find(root, node => hasClass(node, className));

function one(root: Node, name: string, className?: string): ElementNode {
	const found = byName(root, name, className);
	expect(found.length, `${name}${className ? `.${className}` : ''}`).toBe(1);
	return found[0];
}

function text(root: Node): string {
	let value = '';
	walkSync(root, node => {
		if (node.type === TEXT_NODE) value += node.value;
	});
	return value.replace(/\s+/g, ' ').trim();
}

const decode = (value = '') => value.replace(/&#38;|&amp;/g, '&');
const children = (node: ElementNode) =>
	node.children.filter((child): child is ElementNode => child.type === ELEMENT_NODE);

async function html(path: string, status = 200) {
	const response = await fetch(`${base}${path}`, { redirect: 'manual' });
	expect(response.status, path).toBe(status);
	return parse(await response.text()) as Node;
}

function expectStreamPlayer(document: Node, title: string, src: string) {
	const iframes = byName(document, 'iframe');
	expect(iframes.length).toBe(1);
	const [iframe] = iframes;
	expect(decode(iframe.attributes.src)).toBe(src);
	expect(iframe.attributes.title).toBe(title);
	expect(iframe.attributes.loading).toBe('lazy');
	expect(iframe.attributes.allow).toBe('picture-in-picture');
	expect(Object.hasOwn(iframe.attributes, 'allowfullscreen')).toBe(true);
	expect(Object.keys(iframe.attributes).some(name => /autoplay/i.test(name))).toBe(false);
	expect(new URL(decode(iframe.attributes.src)).searchParams.has('autoplay')).toBe(false);
	const player = one(document, 'div', 'player');
	expect(byName(player, 'iframe')).toEqual([iframe]);
	expect(children(one(document, 'div', 'screen-frame'))).toEqual([player]);
	expect(children(player)).toEqual([iframe]);
	expect(text(iframe)).toBe('');
}

function expectVideoShell(document: Node, entry: { title: string; slug: string }, collection: string, backLabel: string) {
	const body = one(document, 'body');
	expect(byName(document, 'main').length).toBe(1);
	const main = one(document, 'main', 'video-theater');
	const elementsInBody = children(body).filter(node => node.name !== 'script');
	expect(elementsInBody.map(node => node.name)).toEqual(['header', 'main', 'footer']);
	expect(elementsInBody[1]).toBe(main);

	const article = children(main);
	expect(article.length).toBe(1);
	expect(article[0].name).toBe('article');
	expect(hasClass(article[0], 'video-item')).toBe(true);

	const title = one(main, 'h1', 'video-title');
	expect(text(title)).toBe(entry.title);
	const back = one(one(main, 'div', 'video-return'), 'a');
	expect(back.attributes.href).toBe(`/${collection}`);
	expect(text(back)).toBe(backLabel);

	const active = find(one(document, 'header'), node => node.name === 'a' && node.attributes['aria-current'] === 'page');
	expect(active.map(node => node.attributes.href)).toEqual([`/${collection}`]);

	const head = one(document, 'head');
	expect(text(one(head, 'title'))).toBe(`${entry.title} | Charles Slater`);
	expect(find(head, node => node.name === 'link' && node.attributes.rel === 'canonical')
		.map(node => node.attributes.href)).toEqual([`https://charlesslater.com/${collection}/${entry.slug}`]);

	// No auto-rendered collection UI or imagery inside the stage.
	expect(byName(main, 'img')).toEqual([]);
	expect(byName(main, 'time')).toEqual([]);
	return { main, article: article[0] };
}

const metaDescription = (document: Node) =>
	find(one(document, 'head'), node => node.name === 'meta' && node.attributes.name === 'description')
		.map(node => node.attributes.content);

describe('video presentation — server-rendered HTML', () => {
	it('renders a poem with videoUrl as title, player, Markdown body and back link', async () => {
		const document = await html(`/poetry/${POEM.slug}`);
		const { main, article } = expectVideoShell(document, POEM, 'poetry', '← Back to all poems');
		expectStreamPlayer(document, POEM.title, POEM.videoUrl);

		expect(children(article).map(node => node.attributes.class)).toEqual([
			'video-title', 'screen-frame', 'video-prose', 'video-return',
		]);
		const prose = one(main, 'div', 'video-prose');
		expect(text(one(prose, 'strong'))).toBe('celebration');
		expect(one(prose, 'a').attributes.href).toBe('/gallery');
		expect(text(one(prose, 'h2'))).toBe('Fixture program');
		expect(byName(prose, 'li').map(text)).toEqual(['First fixture item', 'Second fixture item']);

		// Poem-specific UI stays out of the video page, including the dark reader toggle and its script.
		for (const className of [
			'poetry-dark-reader-toggle', 'poetry-reader-surface', 'poem-header', 'poem-meta',
			'poem-content', 'poem-footer', 'decorative-image-wrap', 'tags', 'tag',
		]) {
			expect(byClass(document, className), className).toEqual([]);
		}
		expect(find(document, node => node.attributes.id === 'dark-reader-toggle' || Object.hasOwn(node.attributes, 'data-poetry-reader'))).toEqual([]);
		for (const script of byName(document, 'script')) {
			expect(script.attributes.src ?? '').not.toMatch(/PoetryDarkReaderToggle/);
			expect(text(script)).not.toContain('dadsite:poetry-dark-reader');
		}

		// Required metadata still feeds the head.
		expect(metaDescription(document)).toEqual([POEM.excerpt]);
	});

	it('renders a novel with videoUrl and an empty body without synopsis, cover or purchase UI', async () => {
		const document = await html(`/novels-movies/${NOVEL.slug}`);
		const { main, article } = expectVideoShell(document, NOVEL, 'novels-movies', '← Back to all novels');
		expectStreamPlayer(document, NOVEL.title, NOVEL.videoUrl);

		expect(children(article).map(node => node.attributes.class)).toEqual([
			'video-title', 'screen-frame', 'video-return',
		]);
		for (const className of [
			'novel-surface', 'novel-single-layout', 'novel-header', 'novel-info', 'synopsis',
			'novel-content', 'novel-cover', 'novel-purchase-links', 'purchase-link', 'video-prose',
		]) {
			expect(byClass(document, className), className).toEqual([]);
		}
		const visible = text(main);
		for (const hidden of [NOVEL.synopsis, 'Synopsis', NOVEL.purchaseLabel, NOVEL.coverAlt, 'Published', 'pages']) {
			expect(visible).not.toContain(hidden);
		}

		expect(metaDescription(document)).toEqual([NOVEL.synopsis]);
	});

	it('keeps ordinary poem and novel detail pages on their standard templates', async () => {
		const poem = await html('/poetry/boxes-of-childhood-at-the-curb');
		expect(byClass(poem, 'video-theater')).toEqual([]);
		expect(byName(poem, 'iframe')).toEqual([]);
		one(poem, 'div', 'poetry-dark-reader-toggle');
		one(poem, 'div', 'poetry-reader-surface');
		one(poem, 'header', 'poem-header');
		one(poem, 'div', 'poem-content');
		expect(byName(one(poem, 'header', 'poem-header'), 'time').length).toBe(1);

		const memorial = await html('/poetry/charles-slater-1932-2022');
		expect(byClass(memorial, 'video-theater')).toEqual([]);
		one(memorial, 'header', 'poem-header');
		expect(new URL(one(one(memorial, 'div', 'poem-content'), 'iframe').attributes.src).hostname).toBe('onedrive.live.com');

		const novel = await html('/novels-movies/cutting-in');
		expect(byClass(novel, 'video-theater')).toEqual([]);
		expect(byName(novel, 'iframe')).toEqual([]);
		one(novel, 'article', 'novel-surface');
		expect(text(one(one(novel, 'div', 'synopsis'), 'h3'))).toBe('Synopsis');
		one(one(novel, 'aside', 'novel-cover'), 'img');
		expect(byName(novel, 'a', 'purchase-link').length).toBeGreaterThan(0);
	});

	it('lists video entries in the unchanged collection listings and tag pages', async () => {
		const poetry = await html('/poetry');
		const poemLinks = find(poetry, node => node.name === 'a' && node.attributes.href === `/poetry/${POEM.slug}`);
		expect(poemLinks.map(node => node.attributes.class)).toEqual(['poem-title']);
		expect(text(poemLinks[0])).toBe(POEM.title);

		const tag = await html('/poetry/tags/family');
		expect(find(tag, node => node.name === 'a' && node.attributes.href === `/poetry/${POEM.slug}`).length).toBe(1);

		const novels = await html('/novels-movies/');
		const card = byName(novels, 'article', 'novel-card')
			.find(node => find(node, link => link.attributes.href === `/novels-movies/${NOVEL.slug}`).length);
		expect(card).toBeDefined();
		expect(text(one(card!, 'p', 'synopsis'))).toBe(NOVEL.synopsis);
		expect(text(one(card!, 'a', 'purchase-link'))).toBe(NOVEL.purchaseLabel);
	});

	it('still returns 404 for unknown entries in both collections', async () => {
		await html(`/poetry/${FIXTURE_PREFIX}missing-${SUFFIX}`, 404);
		await html(`/novels-movies/${FIXTURE_PREFIX}missing-${SUFFIX}`, 404);
	});
});

// ---------------------------------------------------------------------------
// Browser layout (desktop and phones) with a synthetic Stream player
// ---------------------------------------------------------------------------

const SYSTEM_CHROMIUM_PATHS = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'];
const STREAM_HOST = /^https:\/\/customer-[a-z0-9]+\.cloudflarestream\.com\//;
const MOCK_PLAYER = '<!doctype html><html><body style="margin:0;background:#111;color:#ddd;font:16px sans-serif">Mock Stream player</body></html>';

const VIEWPORTS = [
	{ name: 'desktop', width: 1440, height: 900, mobile: false },
	{ name: 'phone', width: 390, height: 844, mobile: true },
	{ name: 'narrow phone', width: 320, height: 640, mobile: true },
];

let browser: Browser;

async function openContext(viewport: (typeof VIEWPORTS)[number]) {
	const context = await browser.newContext({
		viewport: { width: viewport.width, height: viewport.height },
		isMobile: viewport.mobile,
		hasTouch: viewport.mobile,
	});
	const streamRequests: string[] = [];
	await context.route('**/*', route => {
		const url = route.request().url();
		if (url.startsWith(base)) return route.continue();
		if (STREAM_HOST.test(url)) {
			streamRequests.push(url);
			return route.fulfill({ status: 200, contentType: 'text/html', body: MOCK_PLAYER });
		}
		return route.abort();
	});
	return { context, streamRequests };
}

type Box = { x: number; y: number; width: number; height: number; top: number; bottom: number; left: number; right: number };

async function measure(page: Page) {
	return page.evaluate(() => {
		const box = (selector: string): Box | null => {
			const node = document.querySelector(selector);
			if (!node) return null;
			const { x, y, width, height, top, bottom, left, right } = node.getBoundingClientRect();
			return { x, y, width, height, top, bottom, left, right };
		};
		const main = document.querySelector('main.video-theater')!;
		const curtain = (pseudo: string) => {
			const style = getComputedStyle(main, pseudo);
			return {
				zIndex: style.zIndex, pointerEvents: style.pointerEvents, position: style.position,
				width: parseFloat(style.width), height: parseFloat(style.height), opacity: style.opacity,
			};
		};
		const player = box('.player')!;
		const title = box('.video-title')!;
		const hit = (x: number, y: number) => {
			const node = document.elementFromPoint(x, y);
			return node ? `${node.tagName.toLowerCase()}.${[...node.classList].join('.')}` : null;
		};
		return {
			innerWidth: window.innerWidth,
			clientWidth: document.documentElement.clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
			main: box('main.video-theater')!,
			item: box('.video-item')!,
			title,
			frame: box('.screen-frame')!,
			player,
			iframe: box('.player iframe')!,
			prose: box('.video-prose'),
			back: box('.video-return')!,
			footer: box('main ~ footer')!,
			titleStyle: { fontSize: parseFloat(getComputedStyle(document.querySelector('.video-title')!).fontSize), textAlign: getComputedStyle(document.querySelector('.video-title')!).textAlign },
			framePadding: parseFloat(getComputedStyle(document.querySelector('.screen-frame')!).paddingLeft),
			footerMarginTop: getComputedStyle(document.querySelector('main ~ footer')!).marginTop,
			before: curtain('::before'),
			after: curtain('::after'),
			hitPlayer: hit(player.x + player.width / 2, player.y + player.height / 2),
			hitTitle: hit(title.x + title.width / 2, title.y + title.height / 2),
			hitCurtain: hit(2, player.y + player.height / 2),
			bodyClasses: [...document.body.classList],
		};
	});
}

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

describe('video presentation — browser layout', () => {
	beforeAll(async () => {
		const executablePath = SYSTEM_CHROMIUM_PATHS.find(existsSync);
		browser = await chromium.launch({
			...(executablePath ? { executablePath } : {}),
			args: ['--no-sandbox', '--disable-dev-shm-usage'],
		});
	}, 60_000);

	afterAll(async () => {
		await browser?.close();
	});

	for (const viewport of VIEWPORTS) {
		it(`lays out both video variants on ${viewport.name} (${viewport.width}px)`, async () => {
			const { context, streamRequests } = await openContext(viewport);
			// A saved poetry dark reader preference must not leak into video pages.
			await context.addInitScript(() => localStorage.setItem('dadsite:poetry-dark-reader', 'true'));
			try {
				const page = await context.newPage();
				const errors: string[] = [];
				page.on('pageerror', error => errors.push(error.message));

				for (const [entry, collection, hasProse] of [
					[POEM, 'poetry', true],
					[NOVEL, 'novels-movies', false],
				] as const) {
					const response = await page.goto(`${base}/${collection}/${entry.slug}`);
					expect(response?.status()).toBe(200);
					await expect.poll(() => page.frameLocator('.player iframe').locator('body').textContent()).toBe('Mock Stream player');
					await expect.poll(() => page.locator('.player iframe').getAttribute('src')).toBe(entry.videoUrl);
					const m = await measure(page);
					const label = `${viewport.name} ${collection}`;

					expect(m.scrollWidth, label).toBeLessThanOrEqual(m.clientWidth);
					expect(m.main.left, label).toBe(0);
					expect(m.main.width, label).toBeCloseTo(m.clientWidth, 0);

					const gutter = viewport.width <= 720 ? 24 : 64;
					expect(m.item.width, label).toBeCloseTo(Math.min(1150, m.clientWidth - gutter), 0);
					expect(m.item.left, label).toBeCloseTo((m.clientWidth - m.item.width) / 2, 0);

					expect(m.titleStyle.textAlign, label).toBe('center');
					expect(m.titleStyle.fontSize, label).toBeCloseTo(clamp(31.2, 0.038 * m.innerWidth, 44.8), 1);
					expect(m.title.left + m.title.width / 2, label).toBeCloseTo(m.clientWidth / 2, 0);
					expect(m.title.top, label).toBeGreaterThan(m.main.top);
					expect(m.hitTitle, label).toBe('h1.video-title');

					expect(m.framePadding, label).toBeCloseTo(clamp(5, 0.0065 * m.innerWidth, 9), 1);
					expect(m.frame.width, label).toBeCloseTo(m.item.width, 0);
					expect(m.player.width, label).toBeCloseTo(m.frame.width - 2 * m.framePadding - 2, 0);
					expect(m.player.height, label).toBeCloseTo((m.player.width * 9) / 16, 0);
					expect(m.iframe, label).toEqual(m.player);
					expect(m.hitPlayer, label).toBe('iframe.');

					for (const curtain of [m.before, m.after]) {
						expect(curtain.zIndex, label).toBe('-1');
						expect(curtain.pointerEvents, label).toBe('none');
						expect(curtain.position, label).toBe('absolute');
						expect(curtain.height, label).toBeCloseTo(m.main.height - 1, 0);
						if (viewport.width <= 720) {
							expect(curtain.opacity, label).toBe('0.45');
							expect(curtain.width, label).toBeCloseTo(0.12 * m.innerWidth, 0);
						} else {
							expect(curtain.opacity, label).toBe('1');
							expect(curtain.width, label).toBeCloseTo(clamp(65, 0.17 * m.innerWidth, 300), 0);
						}
					}
					expect(m.hitCurtain, label).toBe('main.video-theater');

					expect(m.title.bottom, label).toBeLessThanOrEqual(m.frame.top);
					if (hasProse) {
						expect(m.prose, label).not.toBeNull();
						expect(m.frame.bottom, label).toBeLessThanOrEqual(m.prose!.top);
						expect(m.prose!.bottom, label).toBeLessThanOrEqual(m.back.top);
						expect(m.prose!.width, label).toBeCloseTo(viewport.width <= 720 ? m.item.width - 12 : Math.min(760, m.item.width), 0);
						expect(await page.locator('.video-prose h2').isVisible(), label).toBe(true);
					} else {
						expect(m.prose, label).toBeNull();
						// Only the return link's own margin separates it from the player.
						expect(m.back.top - m.frame.bottom, label).toBeCloseTo(viewport.width <= 720 ? 24 : 32, 0);
					}
					expect(await page.locator('.video-return a').isVisible(), label).toBe(true);
					expect(await page.locator('.video-return a').getAttribute('href'), label).toBe(`/${collection}`);

					expect(m.footerMarginTop, label).toBe('0px');
					expect(m.footer.top, label).toBeCloseTo(m.main.bottom, 0);

					expect(m.bodyClasses, label).not.toContain('poetry-dark-enabled');
					expect(await page.locator('#dark-reader-toggle').count(), label).toBe(0);

					if (viewport.mobile) {
						const navOpen = () => page.evaluate(() => document.body.classList.contains('nav-open'));
						const hamburger = page.locator('.hamburger');
						expect(await hamburger.isVisible(), label).toBe(true);
						expect(await page.locator('.site-header .nav-links').isVisible(), label).toBe(false);
						await hamburger.click();
						await expect.poll(navOpen).toBe(true);
						const drawerLink = page.locator(`.mobile-nav__drawer a[href="/${collection}"]`);
						await expect.poll(async () => (await drawerLink.boundingBox())?.x ?? Infinity).toBeLessThan(viewport.width);
						await page.keyboard.press('Escape');
						await expect.poll(navOpen).toBe(false);
					} else {
						const navLink = page.locator(`.site-header .nav-links a[href="/${collection}"]`);
						expect(await navLink.isVisible(), label).toBe(true);
						expect(await navLink.getAttribute('aria-current'), label).toBe('page');
					}
				}

				expect(streamRequests.length).toBeGreaterThanOrEqual(2);
				expect(errors).toEqual([]);

				// The same saved preference still applies on an ordinary poem, whose layout is unchanged.
				await page.goto(`${base}/poetry/boxes-of-childhood-at-the-curb`);
				await expect.poll(() => page.evaluate(() => document.body.classList.contains('poetry-dark-enabled'))).toBe(true);
				expect(await page.locator('main.video-theater').count()).toBe(0);
				const ordinary = await page.evaluate(() => {
					const main = getComputedStyle(document.querySelector('main')!);
					const footer = getComputedStyle(document.querySelector('main ~ footer')!);
					return {
						width: main.width, maxWidth: main.maxWidth, padding: main.padding,
						footerMarginTop: parseFloat(footer.marginTop), footerFontSize: parseFloat(footer.fontSize),
					};
				});
				if (viewport.width > 720) {
					expect(ordinary.width).toBe('1150px');
					expect(ordinary.maxWidth).toBe('calc(100% - 72px)');
					expect(ordinary.padding).toBe('54px 36px');
				} else if (viewport.width > 520) {
					expect(ordinary.padding).toBe('16px');
				} else {
					expect(ordinary.maxWidth).toBe('calc(100% - 19.2px)');
					expect(ordinary.padding).toBe('14.4px 9.6px');
				}
				expect(ordinary.footerMarginTop).toBeCloseTo(4 * ordinary.footerFontSize, 1);
			} finally {
				await context.close();
			}
		}, 90_000);
	}
});
