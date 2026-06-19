import { describe, it, expect } from "vitest";
import {
	LOCALES,
	MASTER_LOCALE,
	FALLBACK_MATRIX,
	isLocale,
	resolutionChain,
	resolveLocale,
	type Locale,
} from "../../src/lib/locales";

describe("locale model", () => {
	it("includes every supported locale with the master first", () => {
		expect(LOCALES).toEqual(["en-us", "fr-fr", "es-mx", "fr-ca"]);
		expect(MASTER_LOCALE).toBe("en-us");
		expect(LOCALES[0]).toBe(MASTER_LOCALE);
	});

	it("recognizes valid locales and rejects others", () => {
		expect(isLocale("fr-ca")).toBe(true);
		expect(isLocale("de-de")).toBe(false);
		expect(isLocale(undefined)).toBe(false);
		expect(isLocale(null)).toBe(false);
	});
});

describe("resolutionChain", () => {
	it("starts with the requested locale then its fallbacks", () => {
		expect(resolutionChain("fr-ca")).toEqual(["fr-ca", "fr-fr", "en-us"]);
		expect(resolutionChain("fr-fr")).toEqual(["fr-fr", "en-us"]);
		expect(resolutionChain("es-mx")).toEqual(["es-mx", "en-us"]);
		expect(resolutionChain("en-us")).toEqual(["en-us"]);
	});

	it("matches the declared fallback matrix", () => {
		for (const locale of LOCALES) {
			expect(resolutionChain(locale)).toEqual([
				locale,
				...FALLBACK_MATRIX[locale],
			]);
		}
	});
});

describe("resolveLocale", () => {
	it("returns the requested locale when a physical file exists", () => {
		const available: Locale[] = ["en-us", "fr-fr", "fr-ca"];
		expect(resolveLocale("fr-ca", available)).toBe("fr-ca");
	});

	it("falls back fr-ca -> fr-fr when fr-ca is missing", () => {
		expect(resolveLocale("fr-ca", ["en-us", "fr-fr"])).toBe("fr-fr");
	});

	it("falls back fr-ca -> en-us when both fr-ca and fr-fr are missing", () => {
		expect(resolveLocale("fr-ca", ["en-us"])).toBe("en-us");
	});

	it("falls back fr-fr -> en-us", () => {
		expect(resolveLocale("fr-fr", ["en-us"])).toBe("en-us");
	});

	it("falls back es-mx -> en-us", () => {
		expect(resolveLocale("es-mx", ["en-us"])).toBe("en-us");
	});

	it("returns undefined when nothing in the chain resolves", () => {
		expect(resolveLocale("es-mx", [])).toBeUndefined();
		expect(resolveLocale("fr-fr", ["es-mx"])).toBeUndefined();
	});

	it("never invents a locale outside the chain", () => {
		// fr-fr is present but es-mx's chain is [es-mx, en-us], so fr-fr must not match.
		expect(resolveLocale("es-mx", ["fr-fr"])).toBeUndefined();
	});
});
