import { getCollection } from 'astro:content';

/**
 * Converts a tag string into a URL-safe slug
 * - Lowercase
 * - Trim whitespace
 * - Replace spaces with hyphens
 * - Remove/replace unsafe characters
 * - Normalize consecutive hyphens
 * - Remove leading/trailing hyphens
 */
export function slugifyTag(tag: string): string {
	return tag
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Gets all unique tags from the poetry collection
 * Returns array of unique tag strings
 */
export async function getAllUniqueTags(): Promise<string[]> {
	const poems = await getCollection('poetry');
	const tagSet = new Set<string>();
	
	poems.forEach(poem => {
		if (poem.data.tags && Array.isArray(poem.data.tags)) {
			poem.data.tags.forEach(tag => tagSet.add(tag));
		}
	});
	
	return Array.from(tagSet).sort();
}

/**
 * Creates a map from tag slugs to original tag text
 * Used to efficiently find the original casing/formatting of a tag
 */
export async function getTagSlugMap(): Promise<Map<string, string>> {
	const uniqueTags = await getAllUniqueTags();
	const slugMap = new Map<string, string>();
	
	uniqueTags.forEach(tag => {
		slugMap.set(slugifyTag(tag), tag);
	});
	
	return slugMap;
}
