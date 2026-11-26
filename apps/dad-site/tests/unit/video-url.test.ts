/**
 * Unit tests for the optional `videoUrl` frontmatter field.
 *
 * Imports the real collection schemas from src/content.config.ts. The
 * `astro:content` virtual module only exists inside Astro, so it is replaced
 * with a pass-through `defineCollection` and the same `astro/zod` instance it
 * re-exports.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', async () => {
	const { z } = await import('astro/zod');
	return { defineCollection: <T>(config: T) => config, z };
});

const { collections } = await import('../../src/content.config');
const { streamVideoUrl } = await import('../../src/utils/streamVideo');

const STREAM_URL =
	'https://customer-c123v39c6391mh3k.cloudflarestream.com/c540a969fb9588fa5cce2779d3fb54c3/iframe?poster=https%3A%2F%2Fcustomer-c123v39c6391mh3k.cloudflarestream.com%2Fc540a969fb9588fa5cce2779d3fb54c3%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600';
const VIDEO_PATH = '/c540a969fb9588fa5cce2779d3fb54c3/iframe';
const HOST = 'customer-c123v39c6391mh3k.cloudflarestream.com';

const poem = {
	title: 'Test Poem',
	date: '2022-11-20',
	tags: ['family'],
	excerpt: 'A short excerpt.',
	decorativeImage: 'memory',
};

const novel = {
	title: 'Test Novel',
	publicationDate: '2015-10-30',
	printLength: 306,
	synopsis: 'A test synopsis.',
	purchaseLinks: [{ label: 'Amazon', url: 'https://www.amazon.com/dp/XXXXXXXXXX' }],
	coverImage: '/cover.jpg',
	coverImageAlt: 'Book cover for Test Novel',
};

type Schema = { safeParse: (value: unknown) => { success: boolean; data?: Record<string, unknown> } };
const schemas: Array<[string, Schema, Record<string, unknown>, string[]]> = [
	['poetry', collections.poetry.schema as unknown as Schema, poem, ['title', 'date', 'excerpt']],
	['novels', collections.novels.schema as unknown as Schema, novel, ['title', 'synopsis']],
];

const INVALID: Array<[string, unknown]> = [
	['empty string', ''],
	['whitespace only', '   '],
	['surrounding whitespace', ` ${STREAM_URL}`],
	['null (blank YAML value)', null],
	['number', 42],
	['array', [STREAM_URL]],
	['malformed URL', 'customer-c123v39c6391mh3k.cloudflarestream.com/abc/iframe'],
	['relative path', VIDEO_PATH],
	['http', `http://${HOST}${VIDEO_PATH}`],
	['protocol-relative', `//${HOST}${VIDEO_PATH}`],
	['javascript scheme', 'javascript:alert(1)'],
	['credentials', `https://user:pass@${HOST}${VIDEO_PATH}`],
	['username only', `https://user@${HOST}${VIDEO_PATH}`],
	['non-default port', `https://${HOST}:8443${VIDEO_PATH}`],
	['unrelated host', `https://example.com${VIDEO_PATH}`],
	['lookalike suffix', `https://${HOST}.evil.example${VIDEO_PATH}`],
	['lookalike label', `https://customer-abc.evilcloudflarestream.com${VIDEO_PATH}`],
	['extra subdomain', `https://evil.${HOST}${VIDEO_PATH}`],
	['missing customer code', `https://customer-.cloudflarestream.com${VIDEO_PATH}`],
	['bare stream host', `https://cloudflarestream.com${VIDEO_PATH}`],
	['trailing-dot host', `https://${HOST}.${VIDEO_PATH}`],
	['videodelivery host', `https://iframe.videodelivery.net/c540a969fb9588fa5cce2779d3fb54c3`],
	['watch path', `https://${HOST}/c540a969fb9588fa5cce2779d3fb54c3/watch`],
	['manifest path', `https://${HOST}/c540a969fb9588fa5cce2779d3fb54c3/manifest/video.m3u8`],
	['missing video id', `https://${HOST}/iframe`],
	['empty video id', `https://${HOST}//iframe`],
	['trailing slash', `https://${HOST}${VIDEO_PATH}/`],
	['extra path segment', `https://${HOST}/account${VIDEO_PATH}`],
	['fragment', `${STREAM_URL}#t=10`],
	['empty fragment', `https://${HOST}${VIDEO_PATH}#`],
	['autoplay=true', `https://${HOST}${VIDEO_PATH}?autoplay=true`],
	['bare autoplay after poster', `${STREAM_URL}&autoplay`],
	['autoplay mixed case', `https://${HOST}${VIDEO_PATH}?muted=true&AutoPlay=1`],
];

describe('streamVideoUrl', () => {
	it('accepts the Cloudflare Stream customer iframe src, preserving the encoded poster query', () => {
		const result = streamVideoUrl.safeParse(STREAM_URL);
		expect(result.success).toBe(true);
		expect(result.data).toBe(STREAM_URL);
	});

	it('accepts a bare iframe src and ordinary player parameters', () => {
		for (const value of [
			`https://${HOST}${VIDEO_PATH}`,
			`https://${HOST}${VIDEO_PATH}?muted=true&loop=true&preload=metadata`,
		]) {
			expect(streamVideoUrl.safeParse(value).success, value).toBe(true);
		}
	});

	it.each(INVALID)('rejects %s', (_label, value) => {
		expect(streamVideoUrl.safeParse(value).success).toBe(false);
	});

	it('explains the accepted form in the validation message', () => {
		const result = streamVideoUrl.safeParse(`https://${HOST}/abc/watch`);
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toMatch(/\/<video-id>\/iframe/);
	});
});

describe.each(schemas)('%s collection schema — videoUrl', (_name, schema, base, required) => {
	it('keeps videoUrl optional and absent by default', () => {
		const result = schema.safeParse(base);
		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('videoUrl');
	});

	it('accepts a valid Stream iframe src unchanged', () => {
		const result = schema.safeParse({ ...base, videoUrl: STREAM_URL });
		expect(result.success).toBe(true);
		expect(result.data?.videoUrl).toBe(STREAM_URL);
	});

	it.each(INVALID)('rejects videoUrl: %s', (_label, value) => {
		expect(schema.safeParse({ ...base, videoUrl: value }).success).toBe(false);
	});

	it('still requires the existing required fields alongside a valid videoUrl', () => {
		for (const field of required) {
			const { [field]: _omitted, ...rest } = base;
			expect(schema.safeParse({ ...rest, videoUrl: STREAM_URL }).success, field).toBe(false);
		}
	});
});
