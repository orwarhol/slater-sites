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
		const l = buildLookup([{ from: "/poems/*", to: "/poetry/*" }]);
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
		// '/poems' without trailing slash must not match '/poems/*'
		expect(resolve("/poems", [{ from: "/poems/*", to: "/poetry/*" }])).toBeNull();
	});

	it("does not partially match a longer prefix", () => {
		// '/poemsXYZ/foo' must not match '/poems/*'
		expect(resolve("/poemsXYZ/foo", [{ from: "/poems/*", to: "/poetry/*" }])).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — exact match
// ---------------------------------------------------------------------------

describe("resolveRedirect — exact match", () => {
	it("matches an exact path", () => {
		const result = resolve("/books", [{ from: "/books", to: "/novels" }]);
		expect(result).not.toBeNull();
		expect(result!.destination).toBe("/novels");
	});

	it("defaults status to 301", () => {
		const result = resolve("/books", [{ from: "/books", to: "/novels" }]);
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
		const result = resolve("/books", [{ from: "/books", to: "/novels" }], "?ref=abc");
		expect(result!.destination).toBe("/novels?ref=abc");
	});

	it("preserves an empty query string (no trailing ?)", () => {
		const result = resolve("/books", [{ from: "/books", to: "/novels" }], "");
		expect(result!.destination).toBe("/novels");
	});

	it("does not match a path that only starts with the from value", () => {
		expect(resolve("/books/chapter", [{ from: "/books", to: "/novels" }])).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — prefix match
// ---------------------------------------------------------------------------

describe("resolveRedirect — prefix match", () => {
	it("matches a path under the prefix", () => {
		const result = resolve("/poems/spring", [{ from: "/poems/*", to: "/poetry/*" }]);
		expect(result).not.toBeNull();
		expect(result!.destination).toBe("/poetry/spring");
	});

	it("rewrites deeply nested paths", () => {
		const result = resolve("/poems/2024/spring", [{ from: "/poems/*", to: "/poetry/*" }]);
		expect(result!.destination).toBe("/poetry/2024/spring");
	});

	it("matches a path with only a trailing slash after the prefix", () => {
		const result = resolve("/poems/", [{ from: "/poems/*", to: "/poetry/*" }]);
		expect(result!.destination).toBe("/poetry/");
	});

	it("drops the tail when `to` has no `/*`", () => {
		const result = resolve("/poems/anything", [{ from: "/poems/*", to: "/poetry" }]);
		expect(result!.destination).toBe("/poetry");
	});

	it("defaults status to 301 for prefix rules", () => {
		const result = resolve("/poems/spring", [{ from: "/poems/*", to: "/poetry/*" }]);
		expect(result!.status).toBe(301);
	});

	it("uses a custom status for prefix rules", () => {
		const result = resolve("/poems/spring", [{ from: "/poems/*", to: "/poetry/*", status: 302 }]);
		expect(result!.status).toBe(302);
	});

	it("appends query string to the rewritten destination", () => {
		const result = resolve("/poems/spring", [{ from: "/poems/*", to: "/poetry/*" }], "?ref=test");
		expect(result!.destination).toBe("/poetry/spring?ref=test");
	});

	it("appends query string when to has no `/*`", () => {
		const result = resolve("/poems/spring", [{ from: "/poems/*", to: "/archive" }], "?ref=test");
		expect(result!.destination).toBe("/archive?ref=test");
	});
});

// ---------------------------------------------------------------------------
// resolveRedirect — precedence (exact beats prefix)
// ---------------------------------------------------------------------------

describe("resolveRedirect — exact takes priority over prefix", () => {
	const rules: RedirectRule[] = [
		{ from: "/poetry/featured", to: "/featured-poem" }, // exact
		{ from: "/poetry/*", to: "/poems-new/*" }, // prefix
	];

	it("uses the exact rule for an exact match", () => {
		const result = resolve("/poetry/featured", rules);
		expect(result!.destination).toBe("/featured-poem");
	});

	it("falls through to the prefix rule for other paths", () => {
		const result = resolve("/poetry/spring", rules);
		expect(result!.destination).toBe("/poems-new/spring");
	});
});
