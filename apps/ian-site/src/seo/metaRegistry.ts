/**
 * SEO Meta Registry
 * 
 * Centralized registry for managing SEO meta tags across the site.
 * Provides title, description, and optional image for all pages, blog posts, and projects.
 */

interface MetaEntry {
	title: string;
	description: string;
	image?: string;
}

interface MetaRegistry {
	[key: string]: MetaEntry;
}

/**
 * Main registry of SEO meta entries
 * 
 * Key patterns:
 * - Pages: "page:/" for home, "page:/blog", "page:/projects", "page:/gallery"
 * - Blog posts: "blog:<slug>" where slug is the content ID
 * - Projects: "project:<slug>" where slug is the content ID
 */
export const metaRegistry: MetaRegistry = {
	// Core pages
	'page:/': {
		title: 'Ian Slater',
		description: 'Ian Slater is a writer, filmmaker, and photographer. His screenplay Hattie earned an Honorable Mention in the Fresh Voices Screenplay Competition and was a finalist at RIFF. He works in tech product leadership and lives with his wife and two children in Calabasas, California.',
		image: '/ian-slater-profile-photo.jpg',
	},
	'page:/blog': {
		title: 'Blog - Ian Slater',
		description: 'Writing about technology, creativity, and the craft of making things.',
	},
	'page:/projects': {
		title: 'Projects - Ian Slater',
		description: 'Screenplays, films, and creative writing projects by Ian Slater.',
	},
	'page:/gallery': {
		title: 'Gallery - Ian Slater',
		description: 'Photography gallery',
	},

	// Blog posts
	'blog:hello-world-again': {
		title: 'Hello, World (Again) | Ian Slater',
		description: 'Learning Astro, shipping on Cloudflare Pages, and rediscovering what "control" can feel like.',
		image: '/palette-reference-image-chatgpt.png',
	},

	// Projects
	'project:hattie': {
		title: 'Hattie | Ian Slater',
		description: 'A curious teen receives an old typewriter from an elderly neighbor that leads to secrets of the woman\'s missing husband, a drowning boy from her dreams, and her long-gone father.',
	},
	'project:alyssa-craft': {
		title: 'Alyssa Craft | Ian Slater',
		description: 'Alyssa wants a normal life. Cassandra wants the truth—loudly. In Sedona, where the desert hums with secrets, the estranged sisters get dragged into a string of supernatural incidents that keeps pulling them back together… whether they like it or not.',
	},
	'project:dark-love': {
		title: 'Dark Love | Ian Slater',
		description: 'When cynical college student MK Cleary flies to Paris after a desperate message from her estranged sister, she\'s pulled into a sleek underworld of luxury hotels, corrupt power, and dangerous desire—where the one woman who can help her may be the one who ruins her.',
	},
};

interface ResolveMetaArgs {
	key: string;
	fallback: {
		title: string;
		description: string;
		image?: string;
	};
}

interface ResolvedMeta {
	title: string;
	description: string;
	image?: string;
}

/**
 * Resolves meta tags by merging registry entries with fallback values
 * 
 * Priority:
 * 1. Registry override (if present)
 * 2. Fallback values passed by caller
 * 
 * Logs a warning in dev/build when a key is missing from the registry.
 */
export function resolveMeta(args: ResolveMetaArgs): ResolvedMeta {
	const { key, fallback } = args;
	const registryEntry = metaRegistry[key];

	// Warn if key is missing from registry
	if (!registryEntry) {
		console.warn(`[seo] Missing meta registry entry for key "${key}". Add it to src/seo/metaRegistry.ts`);
		return fallback;
	}

	// Merge registry entry with fallback (registry takes precedence, but allow partial overrides)
	return {
		title: registryEntry.title ?? fallback.title,
		description: registryEntry.description ?? fallback.description,
		image: registryEntry.image ?? fallback.image,
	};
}
