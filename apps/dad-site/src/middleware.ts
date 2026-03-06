import { defineMiddleware } from "astro:middleware";
import { buildLookup, resolveRedirect, redirects } from "./data/redirects";

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
// Build lookup structures once at module load (not on every request).
// ---------------------------------------------------------------------------
const lookup = buildLookup(redirects);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export const onRequest = defineMiddleware((context, next) => {
	const url = new URL(context.request.url);
	const match = resolveRedirect(url.pathname, url.search, lookup);

	if (match) {
		return context.redirect(match.destination, match.status);
	}

	return next();
});
