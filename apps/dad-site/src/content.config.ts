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
		date: z.coerce.date().optional(),
		notes: z.string().optional(),
		camera: z.string().optional(),
		location: z.string().optional(),
		order: z.number().optional(),
	}),
});

export const collections = { poetry, novels, gallery };
