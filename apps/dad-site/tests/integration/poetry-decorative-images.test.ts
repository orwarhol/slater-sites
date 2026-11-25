import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'tinyglobby';
import { ELEMENT_NODE, parse, renderSync, walkSync, type ElementNode, type Node } from 'ultrahtml';
import { parseDocument } from 'yaml';
import { getDecorativeImageForTag } from '../../src/utils/decorativeImages';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT_DIR = join(APP_ROOT, 'src/content/poetry');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

let server: ChildProcess;
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
		if (server.exitCode !== null) throw new Error(`Dev server exited with status ${server.exitCode}`);
		try {
			await fetch(`${base}/`, { signal: AbortSignal.timeout(5_000) });
			return;
		} catch {
			await new Promise(resolve => setTimeout(resolve, 400));
		}
	}
	throw new Error('Dad-site dev server did not become ready');
}

beforeAll(async () => {
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
}, 120_000);

afterAll(() => {
	if (server?.pid) {
		try {
			process.kill(-server.pid, 'SIGTERM');
		} catch {
			server.kill('SIGTERM');
		}
	}
});

function elements(root: Node, name: string, className?: string): ElementNode[] {
	const found: ElementNode[] = [];
	walkSync(root, node => {
		if (node.type !== ELEMENT_NODE || node.name !== name) return;
		if (className && !node.attributes.class?.split(/\s+/).includes(className)) return;
		found.push(node);
	});
	return found;
}

function poems(): Array<{ file: string; slug: string; image: string | null }> {
	return globSync('**/*.{md,mdx}', { cwd: CONTENT_DIR, expandDirectories: false })
		.map(file => {
			const filename = join(CONTENT_DIR, file);
			const source = readFileSync(filename, 'utf8');
			const frontmatter = source.slice(4, source.indexOf('\n---', 4));
			const data = parseDocument(frontmatter).toJS();
			return {
				file,
				slug: file.replace(/\.(?:md|mdx)$/, ''),
				image: data.decorativeImage ? getDecorativeImageForTag(data.decorativeImage) : null,
			};
		})
		.sort((a, b) => a.file.localeCompare(b.file));
}

async function withConcurrency<T>(items: T[], limit: number, check: (item: T) => Promise<void>) {
	let next = 0;
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const item = items[next++];
			await check(item);
		}
	}));
}

async function page(path: string) {
	const response = await fetch(`${base}${path}`, { redirect: 'manual' });
	expect(response.status, path).toBe(200);
	return parse(await response.text()) as Node;
}

describe('poetry decorative images end-to-end', () => {
	it('renders each published selection once and serves every selected PNG', async () => {
		const entries = poems();
		await withConcurrency(entries, 4, async ({ file, slug, image }) => {
			const document = await page(`/poetry/${slug}`);
			const headers = elements(document, 'header', 'poem-header');
			expect(headers.length, file).toBe(1);
			const wrappers = elements(headers[0], 'div', 'decorative-image-wrap');
			expect(wrappers.length, file).toBe(image ? 1 : 0);
			expect(elements(headers[0], 'img').length, file).toBe(image ? 1 : 0);
			if (image) {
				expect(wrappers[0].attributes['aria-hidden'], file).toBe('true');
				const images = elements(wrappers[0], 'img');
				expect(images.length, file).toBe(1);
				expect(images[0].attributes.src, file).toBe(image);
				expect(images[0].attributes.alt, file).toBe('');
			}
		});

		const images = [...new Set(entries.flatMap(entry => entry.image ? [entry.image] : []))];
		await withConcurrency(images, 4, async image => {
			const response = await fetch(`${base}${image}`);
			expect(response.status, image).toBe(200);
			expect(response.headers.get('content-type'), image).toMatch(/^image\/png\b/i);
			expect(Buffer.from(await response.arrayBuffer()).subarray(0, 8), image).toEqual(PNG_SIGNATURE);
		});
	}, 120_000);

	it('keeps only the header image in the three cleaned-up poems', async () => {
		for (const slug of ['charged-with-concert-glory-and-fear', 'electric-forest', 'eureka']) {
			const document = await page(`/poetry/${slug}`);
			const content = elements(document, 'div', 'poem-content');
			expect(content.length, slug).toBe(1);
			expect(elements(content[0], 'img').length, slug).toBe(0);
		}
	});

	it('preserves tagless rendering and independent ordinary tag links', async () => {
		const tagless = await page('/poetry/a-dead-day');
		expect(elements(tagless, 'div', 'tags').length).toBe(0);
		const document = await page('/poetry/boxes-of-childhood-at-the-curb');
		const tags = elements(elements(document, 'header', 'poem-header')[0], 'a', 'tag');
		expect(tags.map(tag => tag.attributes.href)).toEqual([
			'/poetry/tags/family',
			'/poetry/tags/college',
			'/poetry/tags/growing-up',
			'/poetry/tags/growth',
			'/poetry/tags/moving',
			'/poetry/tags/time',
		]);
	});

	it('preserves the memorial video markup without requesting it', async () => {
		const document = await page('/poetry/charles-slater-1932-2022');
		const iframes = elements(document, 'iframe');
		expect(iframes.length).toBe(1);
		const iframe = iframes[0];
		expect(iframe.attributes.title).toBe('Celebration of life video for Charles Slater');
		expect(new URL(iframe.attributes.src).hostname).toBe('onedrive.live.com');
		expect(iframe.attributes.width).toBe('320');
		expect(iframe.attributes.height).toBe('320');
		expect(iframe.attributes.loading).toBe('lazy');
		expect(iframe.attributes.scrolling).toBe('no');
		expect(iframe.attributes.style).toBe('max-width: 100%; border: 0;');
		expect(Object.hasOwn(iframe.attributes, 'allowfullscreen')).toBe(true);
		expect(renderSync(iframe).includes('Watch the video on OneDrive.')).toBe(true);
	});

	it('returns 404 for an unknown poem', async () => {
		const response = await fetch(`${base}/poetry/no-such-poem-decorative-test`, { redirect: 'manual' });
		expect(response.status).toBe(404);
	});
});
