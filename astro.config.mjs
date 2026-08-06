// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// GitHub Pages project site: https://miaklwalker.github.io/doc-site/
// `base` is consumed everywhere through src/lib/links.ts — never hardcode it.
export default defineConfig({
	// site: "https://miaklwalker.github.io",
	// base: "/doc-site",
	site: 'https://michaelrwalker.netlify.app/',
	// base: '/',
	trailingSlash: "ignore",
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			themes: { light: "github-light-default", dark: "github-dark-default" },
			wrap: false,
		},
	},
	vite: {
		server: {
			// Local docs are symlinked in from sibling repos; let Vite read them.
			fs: { allow: [".."] },
		},
	},
});
