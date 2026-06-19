/**
 * Guide content helpers for Global Field Guide.
 *
 * Bridges Astro's `guides` content collection to the locale model in
 * `./locales`. The `glob` loader assigns each entry an id of the form
 * `{locale}/{slug}` (the file path relative to the collection base, minus the
 * `.md` extension). These helpers parse that id, group physical variants by
 * slug, and apply the generic fallback matrix to resolve which variant a given
 * locale should render.
 */

import { getCollection, type CollectionEntry } from "astro:content";
import {
	LOCALES,
	MASTER_LOCALE,
	isLocale,
	resolveLocale,
	type Locale,
} from "./locales";

export type GuideEntry = CollectionEntry<"guides">;

export interface ParsedGuideId {
	locale: Locale;
	slug: string;
}

/**
 * Parse a collection entry id (`{locale}/{slug}`) into its locale and slug.
 * Returns `undefined` when the leading path segment is not a supported locale,
 * so stray files never get treated as localized content.
 */
export function parseGuideId(id: string): ParsedGuideId | undefined {
	const firstSlash = id.indexOf("/");
	if (firstSlash <= 0) return undefined;
	const locale = id.slice(0, firstSlash);
	const slug = id.slice(firstSlash + 1);
	if (!isLocale(locale) || slug.length === 0) return undefined;
	return { locale, slug };
}

/** All guide entries that live under a recognized locale directory. */
export async function getGuideEntries(): Promise<GuideEntry[]> {
	const entries = await getCollection("guides");
	return entries.filter((entry) => parseGuideId(entry.id) !== undefined);
}

/** A slug and the physical locale variants that exist for it. */
export interface GuideGroup {
	slug: string;
	/** Physical variants keyed by locale. */
	variants: Map<Locale, GuideEntry>;
}

/** Group physical guide variants by slug. */
export function groupBySlug(entries: GuideEntry[]): Map<string, GuideGroup> {
	const groups = new Map<string, GuideGroup>();
	for (const entry of entries) {
		const parsed = parseGuideId(entry.id);
		if (!parsed) continue;
		let group = groups.get(parsed.slug);
		if (!group) {
			group = { slug: parsed.slug, variants: new Map() };
			groups.set(parsed.slug, group);
		}
		group.variants.set(parsed.locale, entry);
	}
	return groups;
}

/** Result of resolving a single guide for a requested locale. */
export interface ResolvedGuide {
	slug: string;
	requestedLocale: Locale;
	/** The locale whose physical file is rendered (may differ on fallback). */
	resolvedLocale: Locale;
	/** True when the requested locale had no physical file. */
	isFallback: boolean;
	entry: GuideEntry;
	/** Locales that have a physical file for this slug. */
	availableLocales: Locale[];
}

/** A locale slot in the switcher: either physical or inherited via fallback. */
export interface LocaleSlot {
	locale: Locale;
	/** True when a physical file exists for this locale. */
	physical: boolean;
	/** The locale actually rendered for this slot (after fallback), if any. */
	resolvedLocale?: Locale;
	/** True when no physical file and no fallback resolves. */
	unavailable: boolean;
}

/** Sort physical locales into the canonical site order. */
function orderLocales(locales: Iterable<Locale>): Locale[] {
	const have = new Set(locales);
	return LOCALES.filter((locale) => have.has(locale));
}

/**
 * Resolve a guide for a requested locale using the fallback matrix. Returns
 * `undefined` only when the slug has no physical files at all in the chain.
 */
export function resolveGuide(
	group: GuideGroup,
	requested: Locale,
): ResolvedGuide | undefined {
	const availableLocales = orderLocales(group.variants.keys());
	const resolvedLocale = resolveLocale(requested, group.variants.keys());
	if (!resolvedLocale) return undefined;
	const entry = group.variants.get(resolvedLocale);
	if (!entry) return undefined;
	return {
		slug: group.slug,
		requestedLocale: requested,
		resolvedLocale,
		isFallback: resolvedLocale !== requested,
		entry,
		availableLocales,
	};
}

/**
 * Build the locale switcher slots for a guide. Physical variants are marked as
 * such; missing variants are marked as fallback/inherited (with the locale they
 * resolve to) or unavailable. Never claims a fallback file is physical.
 */
export function localeSlotsFor(group: GuideGroup): LocaleSlot[] {
	return LOCALES.map((locale) => {
		const physical = group.variants.has(locale);
		if (physical) {
			return { locale, physical: true, resolvedLocale: locale, unavailable: false };
		}
		const resolvedLocale = resolveLocale(locale, group.variants.keys());
		return {
			locale,
			physical: false,
			resolvedLocale,
			unavailable: resolvedLocale === undefined,
		};
	});
}

/** A guide as listed on a locale landing page. */
export interface LocaleListing extends ResolvedGuide {}

/**
 * List every guide resolvable for a locale (its own file or a fallback),
 * sorted newest-first by updatedDate (falling back to pubDate).
 */
export async function listGuidesForLocale(
	locale: Locale,
): Promise<LocaleListing[]> {
	const groups = groupBySlug(await getGuideEntries());
	const listings: LocaleListing[] = [];
	for (const group of groups.values()) {
		const resolved = resolveGuide(group, locale);
		if (resolved) listings.push(resolved);
	}
	return listings.sort(sortByDateDesc);
}

/** Sort comparator: newest updatedDate (or pubDate) first. */
export function sortByDateDesc(a: ResolvedGuide, b: ResolvedGuide): number {
	return dateValue(b.entry) - dateValue(a.entry);
}

function dateValue(entry: GuideEntry): number {
	const { updatedDate, pubDate } = entry.data;
	return (updatedDate ?? pubDate).getTime();
}

/** Recent guides in the master locale, for the home page. */
export async function recentMasterGuides(limit = 4): Promise<LocaleListing[]> {
	const all = await listGuidesForLocale(MASTER_LOCALE);
	return all.slice(0, limit);
}
