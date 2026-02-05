import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
	}),
});

const projects = defineCollection({
	loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		type: z.enum([
			"feature screenplay",
			"short screenplay",
			"TV script",
			"novel",
			"feature film",
			"short film",
		]),
		genre: z.array(z.string()).default([]),
		pages: z.number().nullable().optional(),
	}),
});

const gallery = defineCollection({
	loader: glob({ base: "./src/content/gallery", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		src: z.string(),
		alt: z.string(),
		// Date can be a full date (YYYY-MM-DD) or a year-only value (YYYY)
		// Check for year-only first, then fall back to full date
		date: z.union([
			z.number().int().min(1000).max(9999), // Year as number
			z.string().regex(/^\d{4}$/), // Year as string "YYYY"
			z.coerce.date(), // Full date
		]).optional(),
		notes: z.string().optional(),
		camera: z.string().optional(),
		location: z.string().optional(),
		order: z.number().optional(),
		slug: z.string().optional(),
	}),
});

export const collections = { blog, projects, gallery };
