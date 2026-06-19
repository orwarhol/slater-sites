import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// Surface CMS regionalization drift states. These describe how a localized
// variant relates to its master-locale source. They are system metadata and
// are intentionally NOT exposed as editable schema fields in surface.config.json.
const driftStatus = z.enum([
	"synchronized",
	"drifted",
	"unreviewed",
	"manualOverride",
	"unknown",
]);

const guides = defineCollection({
	loader: glob({ base: "./src/content/guides", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		regionNote: z.string().optional(),
		translationStatus: z.enum([
			"source",
			"localized",
			"adapted",
			"needs-review",
		]),
		audience: z
			.enum(["travelers", "families", "food", "culture", "transit"])
			.optional(),
		tags: z.array(z.string()).default([]),
		surfaceSystemMeta: z
			.object({
				surfaceMasterSha: z.string().optional(),
				surfaceDriftStatus: driftStatus.optional(),
				surfaceLastReconciled: z.string().optional(),
			})
			.optional(),
	}),
});

export const collections = { guides };
