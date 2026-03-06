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
 * TESTING LOCALLY
 * ---------------
 * 1. Add a rule below (e.g. { from: '/test-old', to: '/test-new' }).
 * 2. Run: npm run dev:ian
 * 3. Visit http://localhost:4321/test-old — you should be redirected.
 * 4. Check the Network tab; confirm the status is 301 (or your chosen code).
 * 5. Confirm query strings are preserved:
 *    http://localhost:4321/test-old?ref=abc → http://localhost:4321/test-new?ref=abc
 * 6. Remove the test rule before committing.
 *
 * FORMAT
 * ------
 * {
 *   from: '/old-path',   // exact pathname, must start with /
 *   to:   '/new-path',   // destination pathname or absolute URL
 *   status: 301,         // optional; defaults to 301
 * }
 */

export type RedirectRule = {
	from: string;
	to: string;
	status?: 301 | 302 | 307 | 308;
};

export const redirects: RedirectRule[] = [
	// Add permanent redirects below when content moves.
	// Examples (commented out — do not activate without a real target):
	//
	// { from: '/writing',          to: '/projects',      status: 301 },
	// { from: '/blog/old-post',    to: '/blog/new-post', status: 301 },
];
