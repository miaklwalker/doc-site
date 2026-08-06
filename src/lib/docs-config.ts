/**
 * The shape of `docs/config.json` inside each library repo. This file is the
 * contract between a library and the docs site: it declares the sidebar, the
 * page order, and the titles. Nothing else about the docs directory is
 * meaningful to the site — order never depends on filenames.
 */

export type DocsEntry = {
	/** Sidebar label. */
	label: string;
	/**
	 * Path to the page, relative to the docs directory, without extension.
	 * "overview" resolves to docs/overview.md(x); "api/engine" to
	 * docs/api/engine.md(x). Mutually exclusive with `href`.
	 */
	to?: string;
	/** External URL. Renders as an outbound sidebar link. */
	href?: string;
	/** Optional short tag rendered beside the label, e.g. "new". */
	badge?: string;
};

export type DocsSection = {
	label: string;
	children: DocsEntry[];
	/** When true the section renders collapsed by default. */
	collapsed?: boolean;
};

export type DocsConfig = {
	sections: DocsSection[];
};

export class DocsConfigError extends Error {}

/** Parse and validate a docs/config.json. Throws DocsConfigError on any problem. */
export function parseDocsConfig(raw: unknown, source: string): DocsConfig {
	const fail = (msg: string): never => {
		throw new DocsConfigError(`${source}: ${msg}`);
	};

	if (typeof raw !== "object" || raw === null) fail("expected a JSON object.");
	const cfg = raw as Partial<DocsConfig>;

	if (!Array.isArray(cfg.sections) || cfg.sections.length === 0) {
		fail("expected a non-empty `sections` array.");
	}

	const sections: DocsSection[] = [];

	for (const [i, section] of (cfg.sections as DocsSection[]).entries()) {
		if (typeof section?.label !== "string" || !section.label) {
			fail(`sections[${i}] is missing a "label".`);
		}
		if (!Array.isArray(section.children) || section.children.length === 0) {
			fail(`section "${section.label}" has no children.`);
		}

		const children: DocsEntry[] = [];
		for (const [j, entry] of section.children.entries()) {
			const where = `section "${section.label}" child ${j}`;
			if (typeof entry?.label !== "string" || !entry.label) {
				fail(`${where} is missing a "label".`);
			}
			if (!entry.to && !entry.href) {
				fail(`${where} ("${entry.label}") needs either "to" or "href".`);
			}
			if (entry.to && entry.href) {
				fail(`${where} ("${entry.label}") has both "to" and "href" — pick one.`);
			}
			if (entry.to) {
				if (entry.to.startsWith("/") || entry.to.includes("..")) {
					fail(`${where}: "to" must be a relative path inside the docs directory.`);
				}
				if (/\.mdx?$/.test(entry.to)) {
					fail(`${where}: drop the file extension from "to" — use "${entry.to.replace(/\.mdx?$/, "")}".`);
				}
			}
			children.push({
				label: entry.label,
				...(entry.to ? { to: normaliseSlug(entry.to) } : {}),
				...(entry.href ? { href: entry.href } : {}),
				...(entry.badge ? { badge: entry.badge } : {}),
			});
		}

		sections.push({ label: section.label, children, collapsed: section.collapsed === true });
	}

	return { sections };
}

/** Strip leading "./", trailing slashes, and collapse repeated slashes. */
export function normaliseSlug(slug: string): string {
	return slug
		.replace(/^\.\//, "")
		.replace(/\/+/g, "/")
		.replace(/^\/|\/$/g, "");
}

/** Every internal page referenced by a config, in sidebar order. */
export function internalEntries(config: DocsConfig): Array<DocsEntry & { to: string }> {
	return config.sections.flatMap((s) => s.children.filter((c): c is DocsEntry & { to: string } => !!c.to));
}
