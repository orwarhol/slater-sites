import { z } from 'astro/zod';

/**
 * Validation for the optional `videoUrl` frontmatter field (poetry and novels).
 *
 * The accepted value is only the `src` of a Cloudflare Stream embed iframe:
 *   https://customer-<code>.cloudflarestream.com/<video-id>/iframe[?query]
 *
 * Checks use the parsed URL, never substring matching, and never fetch the URL.
 */
const STREAM_CUSTOMER_HOSTNAME = /^customer-[a-z0-9]+\.cloudflarestream\.com$/;
const STREAM_IFRAME_PATH = /^\/[A-Za-z0-9_-]+\/iframe$/;

export function streamVideoUrlProblem(value: string): string | null {
	if (!value.trim()) return 'must not be blank';
	if (/\s/.test(value)) return 'must not contain whitespace';

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return 'must be an absolute URL';
	}

	if (url.protocol !== 'https:') return 'must use https';
	if (url.username || url.password) return 'must not include credentials';
	if (url.port) return 'must not include a port';
	if (!STREAM_CUSTOMER_HOSTNAME.test(url.hostname)) {
		return 'must use a customer-<code>.cloudflarestream.com host';
	}
	if (!STREAM_IFRAME_PATH.test(url.pathname)) return 'must use the /<video-id>/iframe embed path';
	if (value.includes('#')) return 'must not include a fragment';
	for (const key of url.searchParams.keys()) {
		if (key.toLowerCase() === 'autoplay') return 'must not enable autoplay';
	}
	return null;
}

export const streamVideoUrl = z.string().superRefine((value, ctx) => {
	const problem = streamVideoUrlProblem(value);
	if (problem) {
		ctx.addIssue({
			code: 'custom',
			message: `videoUrl ${problem}; copy only the src of a Cloudflare Stream embed (https://customer-<code>.cloudflarestream.com/<video-id>/iframe)`,
		});
	}
});
