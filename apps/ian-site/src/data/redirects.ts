/**
 * Ian-site redirect registry.
 *
 * Add an entry here whenever a published URL moves to a new path so that
 * visitors (and search engines) are sent to the correct destination without
 * needing to touch the Cloudflare dashboard.
 *
 * WHEN TO USE THIS FILE
 * ---------------------
 * - A page slug changed (e.g. a project was renamed)
 * - A whole section moved (e.g. /writing → /projects)
 * - Any URL that may be indexed or linked externally
 *
 * WHEN TO USE CLOUDFLARE INSTEAD
 * --------------------------------
 * - Apex/www normalisation  (e.g. www.iancharlesslater.com → iancharlesslater.com)
 * - Old-domain-to-new-domain redirects  (e.g. ianslater.com → iancharlesslater.com)
 *
 * STATUS CODES – QUICK GUIDE
 * --------------------------
 * 301 – Permanent redirect. Use for content that has moved for good.
 *        Search engines transfer ranking signals to the new URL.
 * 302 – Temporary redirect. Use when the move is not permanent.
 * 307 – Temporary redirect, preserves the HTTP method (POST stays POST).
 * 308 – Permanent redirect, preserves the HTTP method.
 *
 * Default status is 301 when the `status` field is omitted.
 *
 * RULE FORMAT – EXACT MATCH
 * -------------------------
 * {
 *   from: '/old-path',   // exact pathname, must start with /
 *   to:   '/new-path',   // destination pathname or absolute URL
 *   status: 301,         // optional; defaults to 301
 * }
 *
 * RULE FORMAT – PREFIX (WILDCARD) MATCH
 * --------------------------------------
 * End `from` with `/*` to match any path that starts with that prefix.
 * If `to` also ends with `/*`, the captured tail is rewritten onto the
 * destination; otherwise the tail is dropped and every request below the
 * prefix lands on the same `to` URL.
 *
 * { from: '/old-section/*', to: '/new-section/*' }
 *   /old-section/foo       → /new-section/foo
 *   /old-section/foo/bar   → /new-section/foo/bar
 *
 * { from: '/old-section/*', to: '/new-section' }
 *   /old-section/anything  → /new-section
 *
 * Note: `/*` matches paths that start with the prefix + '/'.
 * It does NOT match the bare prefix without a slash (add a separate
 * exact rule for that if needed, e.g. { from: '/old-section', to: '...' }).
 *
 * HOW TO ADD A REDIRECT
 * ---------------------
 * Append a new object inside the `redirects` array at the bottom of this
 * file.  Do NOT add entries outside the array — they will be ignored and
 * will cause a TypeScript build error.
 *
 * TESTING LOCALLY
 * ---------------
 * 1. Add a rule inside the `redirects` array below.
 * 2. Run: npm run dev:ian
 * 3. Visit http://localhost:4321/old-path — you should be redirected.
 * 4. Check the Network tab; confirm the status is 301 (or your chosen code).
 * 5. Confirm query strings are preserved:
 *    http://localhost:4321/old-path?ref=abc → http://localhost:4321/new-path?ref=abc
 *
 * AUTOMATED TESTS
 * ---------------
 * Run the unit and integration test suites to verify redirect behaviour:
 *   npm run test:unit --workspace=ian-site        # fast, no server needed
 *   npm run test:integration --workspace=ian-site # spins up the dev server
 */

export type RedirectRule = {
	from: string;
	to: string;
	status?: 301 | 302 | 307 | 308;
};

// Returned by resolveRedirect when a rule matches.
export type RedirectMatch = {
	destination: string;
	status: 301 | 302 | 307 | 308;
};

// Pre-built lookup structures created once at startup by buildLookup().
export type RedirectLookup = {
	exactMap: Map<string, RedirectRule>;
	prefixRules: RedirectRule[];
};

/**
 * Build fast lookup structures from a rules array.
 * Self-redirect rules (from === to) are silently dropped.
 * Exact rules and prefix rules (`from` ending in `/*`) are separated.
 */
export function buildLookup(rules: ReadonlyArray<RedirectRule>): RedirectLookup {
	const safeRules = rules.filter((r) => r.from !== r.to);
	return {
		exactMap: new Map(
			safeRules.filter((r) => !r.from.endsWith("/*")).map((r) => [r.from, r]),
		),
		prefixRules: safeRules.filter((r) => r.from.endsWith("/*")),
	};
}

/**
 * Resolve a redirect for the given pathname + query string.
 * Exact rules are checked first; prefix rules are the fallback.
 * Returns null when no rule matches.
 */
export function resolveRedirect(
	pathname: string,
	search: string,
	lookup: RedirectLookup,
): RedirectMatch | null {
	// 1. Exact match (O(1) Map lookup).
	const exact = lookup.exactMap.get(pathname);
	if (exact) {
		return { destination: exact.to + search, status: exact.status ?? 301 };
	}

	// 2. Prefix match (first matching rule wins).
	for (const rule of lookup.prefixRules) {
		const prefix = rule.from.slice(0, -2); // strip trailing '/*'
		if (pathname.startsWith(prefix + "/")) {
			const tail = pathname.slice(prefix.length); // leading '/' included
			const dest = rule.to.endsWith("/*")
				? rule.to.slice(0, -2) + tail // rewrite tail onto destination prefix
				: rule.to; // fixed destination — tail is dropped
			return { destination: dest + search, status: rule.status ?? 301 };
		}
	}

	return null;
}

// ↓↓↓ ADD NEW REDIRECTS INSIDE THIS ARRAY ↓↓↓
export const redirects: RedirectRule[] = [
	// Exact redirects — add when a page slug or section name changes.
	{ from: "/writing", to: "/projects", status: 301 },
	{ from: "/photography", to: "/gallery", status: 301 }, // Squarespace site had a photography section, now we just have a gallery

	// Prefix redirects — add when an entire section is renamed or moved.
	// Every URL under /films/* is rewritten to the same path under /projects/*.
	{ from: "/films/*", to: "/projects/*", status: 301 },
];
// ↑↑↑ ADD NEW REDIRECTS INSIDE THIS ARRAY ↑↑↑
