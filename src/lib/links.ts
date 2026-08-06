/**
 * Every internal URL goes through here. The site is served from a GitHub Pages
 * subpath, so a hardcoded "/foo" link works in dev and 404s in production —
 * this is the one place that knows about `base`.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

/** Build an internal URL. `href("buckets", "overview")` -> "/doc-site/buckets/overview". */
export function href(...segments: Array<string | undefined | null>): string {
	const path = segments
		.filter((s): s is string => typeof s === "string" && s.length > 0)
		.map((s) => s.replace(/^\/+|\/+$/g, ""))
		.filter(Boolean)
		.join("/");
	return path ? `${BASE}/${path}` : `${BASE}/`;
}

/** True when `current` is the page (or inside the section) that `target` points at. */
export function isActive(current: string, target: string): boolean {
	const norm = (s: string) => `/${s.replace(/^\/+|\/+$/g, "")}`;
	return norm(current) === norm(target);
}

export function isExternal(url: string): boolean {
	return /^https?:\/\//.test(url);
}
