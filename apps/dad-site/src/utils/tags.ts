import { getCollection } from 'astro:content';

/**
 * Converts a tag string into a URL-safe slug
 * - Lowercase
 * - Trim whitespace
 * - Replace spaces with hyphens
 * - Remove/replace unsafe characters
 */
export function slugifyTag(tag: string): string {
	return tag
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
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
