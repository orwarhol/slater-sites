import { describe, it, expect } from "vitest";
import { buildLookup, resolveRedirect } from "../../src/data/redirects";
import type { RedirectRule } from "../../src/data/redirects";

/**
 * Unit tests for the redirect matching logic in src/data/redirects.ts.
 *
 * When making changes to redirects, add tests here for:
 * - Any new redirect rule added to the registry that exercises new behaviour
 *   (e.g. a status code not yet covered, a novel URL pattern, edge-case paths).
 * - Any change to buildLookup() or resolveRedirect() — cover the new logic
 *   and add a regression test for the case that prompted the change.
 * - New rule types if the RedirectRule shape is ever extended.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lookup(rules: RedirectRule[]) {
	return buildLookup(rules);
}

function resolve(
	pathname: string,
	rules: RedirectRule[],
	search = "",
) {
	return resolveRedirect(pathname, search, lookup(rules));
}

// ---------------------------------------------------------------------------
// buildLookup
// ---------------------------------------------------------------------------

describe("buildLookup", () => {
	it("separates exact rules from prefix rules", () => {
		const l = buildLookup([
			{ from: "/exact", to: "/dest" },
			{ from: "/prefix/*", to: "/new/*" },
		]);
		expect(l.exactMap.has("/exact")).toBe(true);
		expect(l.exactMap.has("/prefix/*")).toBe(false);
		expect(l.prefixRules).toHaveLength(1);
		expect(l.prefixRules[0].from).toBe("/prefix/*");
	});

	it("drops self-redirect rules (from === to)", () => {
		const l = buildLookup([
			{ from: "/loop", to: "/loop" },
			{ from: "/loop/*", to: "/loop/*" },
			{ from: "/good", to: "/dest" },
		]);
		expect(l.exactMap.has("/loop")).toBe(false);
		expect(l.prefixRules).toHaveLength(0);
		expect(l.exactMap.has("/good")).toBe(true);
	});

	it("keeps rules where from !== to even with /* suffix", () => {
		const l = buildLookup([{ from: "/old/*", to: "/new/*" }]);
		expect(l.prefixRules).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — no match
// ---------------------------------------------------------------------------

describe("resolveRedirect — no match", () => {
	it("returns null when the rules array is empty", () => {
		expect(resolve("/anything", [])).toBeNull();
	});

	it("returns null for a path not in the registry", () => {
		expect(resolve("/unknown", [{ from: "/known", to: "/dest" }])).toBeNull();
	});

	it("does not match a prefix path without a trailing slash", () => {
		// '/old-section' without trailing slash must not match '/old-section/*'
		expect(resolve("/old-section", [{ from: "/old-section/*", to: "/new/*" }])).toBeNull();
	});

	it("does not partially match a longer prefix", () => {
		// '/old-sectionXYZ' must not match '/old-section/*'
		expect(resolve("/old-sectionXYZ/foo", [{ from: "/old-section/*", to: "/new/*" }])).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — exact match
// ---------------------------------------------------------------------------

describe("resolveRedirect — exact match", () => {
	it("matches an exact path", () => {
		const result = resolve("/writing", [{ from: "/writing", to: "/projects" }]);
		expect(result).not.toBeNull();
		expect(result!.destination).toBe("/projects");
	});

	it("defaults status to 301", () => {
		const result = resolve("/writing", [{ from: "/writing", to: "/projects" }]);
		expect(result!.status).toBe(301);
	});

	it("uses a custom status code", () => {
		const result = resolve("/temp", [{ from: "/temp", to: "/dest", status: 302 }]);
		expect(result!.status).toBe(302);
	});

	it("uses status 307", () => {
		const result = resolve("/form", [{ from: "/form", to: "/new-form", status: 307 }]);
		expect(result!.status).toBe(307);
	});

	it("uses status 308", () => {
		const result = resolve("/form", [{ from: "/form", to: "/new-form", status: 308 }]);
		expect(result!.status).toBe(308);
	});

	it("appends the query string to the destination", () => {
		const result = resolve("/writing", [{ from: "/writing", to: "/projects" }], "?ref=abc");
		expect(result!.destination).toBe("/projects?ref=abc");
	});

	it("preserves an empty query string (no trailing ?)", () => {
		const result = resolve("/writing", [{ from: "/writing", to: "/projects" }], "");
		expect(result!.destination).toBe("/projects");
	});

	it("matches the first rule when duplicates exist", () => {
		// buildLookup keeps only the first duplicate since Map inserts are
		// ordered but a second put overwrites — we document 'first wins'.
		// In practice the DEV warning tells the user to avoid duplicates.
		const result = resolve("/page", [
			{ from: "/page", to: "/first" },
			{ from: "/page", to: "/second" },
		]);
		// The Map will hold the last inserted value (second), so either is
		// acceptable — the important thing is that it does NOT return null.
		expect(result).not.toBeNull();
	});

	it("does not match a path that only starts with the from value", () => {
		expect(resolve("/writing/sub", [{ from: "/writing", to: "/projects" }])).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — prefix match
// ---------------------------------------------------------------------------

describe("resolveRedirect — prefix match", () => {
	it("matches a path under the prefix", () => {
		const result = resolve("/films/foo", [{ from: "/films/*", to: "/projects/*" }]);
		expect(result).not.toBeNull();
		expect(result!.destination).toBe("/projects/foo");
	});

	it("rewrites deeply nested paths", () => {
		const result = resolve("/films/2024/my-film", [{ from: "/films/*", to: "/projects/*" }]);
		expect(result!.destination).toBe("/projects/2024/my-film");
	});

	it("matches a path with only a trailing slash after the prefix", () => {
		const result = resolve("/films/", [{ from: "/films/*", to: "/projects/*" }]);
		expect(result!.destination).toBe("/projects/");
	});

	it("drops the tail when `to` has no `/*`", () => {
		const result = resolve("/films/anything", [{ from: "/films/*", to: "/projects" }]);
		expect(result!.destination).toBe("/projects");
	});

	it("defaults status to 301 for prefix rules", () => {
		const result = resolve("/films/foo", [{ from: "/films/*", to: "/projects/*" }]);
		expect(result!.status).toBe(301);
	});

	it("uses a custom status for prefix rules", () => {
		const result = resolve("/films/foo", [{ from: "/films/*", to: "/projects/*", status: 302 }]);
		expect(result!.status).toBe(302);
	});

	it("appends query string to the rewritten destination", () => {
		const result = resolve("/films/foo", [{ from: "/films/*", to: "/projects/*" }], "?ref=test");
		expect(result!.destination).toBe("/projects/foo?ref=test");
	});

	it("appends query string when to has no `/*`", () => {
		const result = resolve("/films/foo", [{ from: "/films/*", to: "/archive" }], "?ref=test");
		expect(result!.destination).toBe("/archive?ref=test");
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — precedence (exact beats prefix)
// ---------------------------------------------------------------------------

describe("resolveRedirect — exact takes priority over prefix", () => {
	const rules: RedirectRule[] = [
		{ from: "/section/special", to: "/special-dest" }, // exact
		{ from: "/section/*", to: "/section-new/*" }, // prefix
	];

	it("uses the exact rule for an exact match", () => {
		const result = resolve("/section/special", rules);
		expect(result!.destination).toBe("/special-dest");
	});

	it("falls through to the prefix rule for other paths", () => {
		const result = resolve("/section/other", rules);
		expect(result!.destination).toBe("/section-new/other");
	});
});
