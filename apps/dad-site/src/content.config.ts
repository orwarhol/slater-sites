import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const poetry = defineCollection({
	loader: glob({ base: "./src/content/poetry", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		excerpt: z.string(),
		decorativeImage: z.string().optional(),
	}),
});

const novels = defineCollection({
	loader: glob({ base: "./src/content/novels", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		publicationDate: z.coerce.date().optional(),
		printLength: z.number().optional(),
		synopsis: z.string(),
		purchaseLinks: z.array(z.object({
			label: z.string(),
			url: z.string(),
		})).default([]),
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

export const collections = { poetry, novels, gallery };
