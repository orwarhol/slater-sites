import { defineMiddleware } from "astro:middleware";
import { redirects } from "./data/redirects";

// ---------------------------------------------------------------------------
// Dev-time validation — logged once at startup, never throws.
// ---------------------------------------------------------------------------
if (import.meta.env.DEV) {
	const seen = new Set<string>();
	for (const rule of redirects) {
		if (seen.has(rule.from)) {
			console.warn(
				`[redirects] Duplicate "from" path detected: "${rule.from}". Only the first matching rule will be used.`,
			);
		}
		seen.add(rule.from);

		if (rule.from === rule.to) {
			console.warn(
				`[redirects] Self-redirect detected for "${rule.from}". This rule will be skipped to prevent a redirect loop.`,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Build a Map for O(1) exact-path lookups.
// ---------------------------------------------------------------------------
const redirectMap = new Map(
	redirects
		.filter((rule) => rule.from !== rule.to)
		.map((rule) => [rule.from, rule]),
);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export const onRequest = defineMiddleware((context, next) => {
	const url = new URL(context.request.url);
	const rule = redirectMap.get(url.pathname);

	if (rule) {
		// Preserve any query string from the original request.
		const destination = rule.to + url.search;
		return context.redirect(destination, rule.status ?? 301);
	}

	return next();
});
