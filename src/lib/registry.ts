import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * A library registered with the docs site. Everything the site knows about a
 * library up front lives here; the pages themselves come from the library's
 * own repo at build time.
 */
export type Library = {
	/** URL segment and cache directory name, e.g. "step-queue". */
	id: string;
	/** Display name, e.g. "Step Queue". */
	name: string;
	/** npm package name, used for install snippets. */
	package: string;
	/** GitHub "owner/repo" — case sensitive, this is used to clone. */
	repo: string;
	/** Branch to pull docs from. */
	branch: string;
	/** Directory inside the repo holding the docs, e.g. "docs". */
	docsDir: string;
	/** Path to a local checkout, relative to the site root. Dev only. */
	local?: string;
	/** One-liner, shown on cards and as the page description. */
	tagline: string;
	/** Longer blurb for the library landing page. */
	description: string;
	/** Accent colour in light mode. */
	accent: string;
	/** Accent colour in dark mode. */
	accentDark: string;
};

export type Registry = { libraries: Library[] };

const REGISTRY_URL = new URL("../../libraries.json", import.meta.url);

/** Absolute path to the site root (the directory holding libraries.json). */
export const SITE_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Directory the sync script writes into, and the content layer reads from. */
export const DOCS_CACHE = fileURLToPath(new URL("../../docs-cache/", import.meta.url));

let cached: Library[] | null = null;

export function loadRegistry(): Library[] {
	if (cached) return cached;

	const raw = JSON.parse(readFileSync(REGISTRY_URL, "utf8")) as Registry;

	if (!Array.isArray(raw.libraries) || raw.libraries.length === 0) {
		throw new Error("libraries.json: expected a non-empty `libraries` array.");
	}

	const seen = new Set<string>();
	for (const lib of raw.libraries) {
		for (const key of ["id", "name", "package", "repo", "branch", "docsDir"] as const) {
			if (!lib[key]) {
				throw new Error(`libraries.json: library "${lib.id ?? "?"}" is missing "${key}".`);
			}
		}
		if (seen.has(lib.id)) {
			throw new Error(`libraries.json: duplicate library id "${lib.id}".`);
		}
		if (!/^[a-z0-9][a-z0-9-]*$/.test(lib.id)) {
			throw new Error(
				`libraries.json: id "${lib.id}" must be lowercase alphanumeric with dashes — it becomes a URL segment.`,
			);
		}
		seen.add(lib.id);
	}

	cached = raw.libraries;
	return cached;
}

export function getLibrary(id: string): Library {
	const lib = loadRegistry().find((l) => l.id === id);
	if (!lib) throw new Error(`No library registered with id "${id}".`);
	return lib;
}
