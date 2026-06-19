/**
 * Central locale model for Global Field Guide.
 *
 * This module is the single source of truth for the site's supported locales,
 * the master locale, the per-locale fallback chains, and the display labels.
 * All routing and content-resolution logic should import from here so the
 * regionalization behavior stays consistent and generic (no per-page rules).
 */

export type Locale = "en-us" | "fr-fr" | "es-mx" | "fr-ca";

/** Every locale the site serves, master first. */
export const LOCALES: readonly Locale[] = ["en-us", "fr-fr", "es-mx", "fr-ca"];

/** The canonical source locale that authored content originates from. */
export const MASTER_LOCALE: Locale = "en-us";

/**
 * Fallback matrix. When a guide has no physical file for a given locale, the
 * site resolves content by walking this ordered list until a real file is
 * found. The master locale needs no entry — it is the final fallback for all.
 */
export const FALLBACK_MATRIX: Record<Locale, Locale[]> = {
	"en-us": [],
	"fr-fr": ["en-us"],
	"es-mx": ["en-us"],
	"fr-ca": ["fr-fr", "en-us"],
};

/** Human-readable labels used in the UI (locale switcher, badges, headers). */
export const LOCALE_LABELS: Record<Locale, string> = {
	"en-us": "English (US)",
	"fr-fr": "Français (France)",
	"es-mx": "Español (México)",
	"fr-ca": "Français (Canada)",
};

/** Short labels for compact badges. */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
	"en-us": "EN-US",
	"fr-fr": "FR-FR",
	"es-mx": "ES-MX",
	"fr-ca": "FR-CA",
};

/** BCP-47-ish `lang` attribute value for the `<html lang>` attribute. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
	"en-us": "en-US",
	"fr-fr": "fr-FR",
	"es-mx": "es-MX",
	"fr-ca": "fr-CA",
};

/** Type guard: is the given string one of our supported locales? */
export function isLocale(value: string | undefined | null): value is Locale {
	return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Build the ordered resolution chain for a locale: the locale itself, followed
 * by its fallbacks. Used to pick which physical file to render.
 */
export function resolutionChain(locale: Locale): Locale[] {
	return [locale, ...FALLBACK_MATRIX[locale]];
}

/**
 * Given the locale the visitor requested and the set of locales that actually
 * have a physical file, return the locale whose file should be rendered, or
 * `undefined` if nothing in the chain resolves.
 */
export function resolveLocale(
	requested: Locale,
	available: Iterable<Locale>,
): Locale | undefined {
	const have = new Set(available);
	for (const candidate of resolutionChain(requested)) {
		if (have.has(candidate)) return candidate;
	}
	return undefined;
}
