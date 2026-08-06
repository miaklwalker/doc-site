import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Every doc page from every library, keyed as "<library-id>/<slug>" — exactly
 * the shape the [library]/[...slug] route wants. The files themselves are put
 * here by scripts/sync-docs.ts; nothing in this repo authors them.
 */
const docs = defineCollection({
	loader: glob({
		base: "./docs-cache",
		pattern: ["*/**/*.{md,mdx}", "!__manifests/**"],
	}),
	schema: z.object({
		title: z.string().optional(),
		description: z.string().optional(),
		/** Hide from search and sitemap without removing it from the sidebar. */
		draft: z.boolean().optional(),
	}),
});

export const collections = { docs };
