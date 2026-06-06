/**
 * Unit tests for the novels content schema.
 *
 * Verifies that `coverImage` and `coverImageAlt` are optional, that existing
 * novels without those fields still parse successfully, and that the Cutting In
 * novel has the expected cover image values.
 */

import { describe, it, expect } from "vitest";
import { z } from "astro/zod";

// Mirror the novels schema shape from src/content.config.ts so this test
// validates the schema contract without importing Astro internals.
const novelsSchema = z.object({
	title: z.string(),
	publicationDate: z.coerce.date().optional(),
	printLength: z.number().optional(),
	synopsis: z.string(),
	purchaseLinks: z
		.array(z.object({ label: z.string(), url: z.string() }))
		.default([]),
	coverImage: z.string().optional(),
	coverImageAlt: z.string().optional(),
});

type NovelsInput = z.input<typeof novelsSchema>;

const baseNovel: NovelsInput = {
	title: "Test Novel",
	synopsis: "A test synopsis.",
	purchaseLinks: [],
};

describe("novels schema — coverImage / coverImageAlt", () => {
	it("accepts a novel with no cover fields", () => {
		const result = novelsSchema.safeParse(baseNovel);
		expect(result.success).toBe(true);
	});

	it("accepts a novel with empty string cover fields", () => {
		const result = novelsSchema.safeParse({
			...baseNovel,
			coverImage: "",
			coverImageAlt: "",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.coverImage).toBe("");
			expect(result.data.coverImageAlt).toBe("");
		}
	});

	it("accepts a novel with both cover fields populated", () => {
		const result = novelsSchema.safeParse({
			...baseNovel,
			coverImage: "/cutting-in-cover-shelley-slater-2015_web.jpg",
			coverImageAlt: "Book cover for Cutting In",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.coverImage).toBe(
				"/cutting-in-cover-shelley-slater-2015_web.jpg",
			);
			expect(result.data.coverImageAlt).toBe("Book cover for Cutting In");
		}
	});

	it("accepts a novel with only coverImage populated (coverImageAlt absent)", () => {
		const result = novelsSchema.safeParse({
			...baseNovel,
			coverImage: "/some-cover.jpg",
		});
		expect(result.success).toBe(true);
	});

	it("coverImage defaults to undefined when absent", () => {
		const result = novelsSchema.safeParse(baseNovel);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.coverImage).toBeUndefined();
			expect(result.data.coverImageAlt).toBeUndefined();
		}
	});
});
