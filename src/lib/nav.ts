import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DocsConfig, DocsSection } from "./docs-config.ts";
import { href } from "./links.ts";
import { DOCS_CACHE, type Library } from "./registry.ts";

const MANIFEST_DIR = join(DOCS_CACHE, "__manifests");

export type NavLink = {
	label: string;
	/** Ready-to-use href, base path already applied. */
	url: string;
	/** Collection entry id ("buckets/overview"), absent for external links. */
	entryId?: string;
	badge?: string;
	external: boolean;
};

export type NavSection = { label: string; collapsed: boolean; links: NavLink[] };

/**
 * The sidebar for a library, as declared by that library's docs/config.json.
 * Written by the sync script so page rendering never reaches into a repo.
 */
export function loadNav(library: Library): NavSection[] {
	const path = join(MANIFEST_DIR, `${library.id}.json`);
	if (!existsSync(path)) {
		throw new Error(`No nav manifest for "${library.id}". Run \`npm run sync\` before building.`);
	}

	const config = JSON.parse(readFileSync(path, "utf8")) as DocsConfig;

	return config.sections.map((section: DocsSection) => ({
		label: section.label,
		collapsed: section.collapsed === true,
		links: section.children.map((child): NavLink => {
			if (child.href) {
				return { label: child.label, url: child.href, badge: child.badge, external: true };
			}
			const slug = child.to as string;
			return {
				label: child.label,
				url: href(library.id, slug),
				entryId: `${library.id}/${slug}`,
				badge: child.badge,
				external: false,
			};
		}),
	}));
}

/** Sidebar order, flattened — the reading order used for prev/next. */
export function flatLinks(nav: NavSection[]): NavLink[] {
	return nav.flatMap((s) => s.links).filter((l) => !l.external);
}

export function neighbours(nav: NavSection[], entryId: string) {
	const links = flatLinks(nav);
	const i = links.findIndex((l) => l.entryId === entryId);
	return {
		prev: i > 0 ? links[i - 1] : undefined,
		next: i >= 0 && i < links.length - 1 ? links[i + 1] : undefined,
	};
}

/** The page a library's landing route should redirect to. */
export function firstPage(nav: NavSection[]): NavLink | undefined {
	return flatLinks(nav)[0];
}
