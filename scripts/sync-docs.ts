/**
 * Pulls the `docs/` directory out of every registered library and materialises
 * it under `docs-cache/`, where the Astro content layer picks it up.
 *
 *   node scripts/sync-docs.ts            prefer local checkouts, clone what's missing
 *   node scripts/sync-docs.ts --remote   always clone (what CI runs)
 *   node scripts/sync-docs.ts --copy     copy files instead of symlinking
 *
 * Local checkouts are symlinked, so editing docs in the library repo shows up
 * in the dev server immediately.
 *
 * Each library syncs as its own Stagehand run — Resolve (locate the source,
 * load its config or fall back to the README), then Materialize (write the
 * cache and its manifest). Runs are independent: one library failing never
 * stops the others, and its error becomes one line in the problem list
 * printed at the end.
 */

import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmdirSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { formatDuration, palette, Script, symbols } from "@michaelrwalker/stagehand";
import { type DocsConfig, internalEntries, parseDocsConfig } from "../src/lib/docs-config.ts";
import { DOCS_CACHE, type Library, loadRegistry, SITE_ROOT } from "../src/lib/registry.ts";

const args = new Set(process.argv.slice(2));
const REMOTE_ONLY = args.has("--remote");
const FORCE_COPY = args.has("--copy");

const CLONE_DIR = resolve(SITE_ROOT, ".clones");
const MANIFEST_DIR = join(DOCS_CACHE, "__manifests");

const problems: string[] = [];
const notes: string[] = [];
/** Libraries whose docs exist locally but are not on the branch we cloned. */
const unpushed: string[] = [];

function log(icon: string, msg: string) {
	process.stdout.write(`${icon} ${msg}\n`);
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/**
 * Remove a path without ever following a symlink into a real repo. `docs-cache`
 * entries are usually symlinks pointing at the user's source checkouts, so a
 * naive recursive delete here would eat their actual docs.
 */
function safeRemove(path: string) {
	let stat: ReturnType<typeof lstatSync>;
	try {
		stat = lstatSync(path);
	} catch {
		return; // does not exist
	}

	if (stat.isSymbolicLink()) {
		unlinkSync(path);
		return;
	}
	if (stat.isDirectory()) {
		for (const entry of readdirSync(path)) safeRemove(join(path, entry));
		rmdirSync(path);
		return;
	}
	unlinkSync(path);
}

/** Shallow, blobless, docs-only clone. Public repos, so no auth is needed. */
function cloneDocs(lib: Library): string {
	const dest = join(CLONE_DIR, lib.id);
	safeRemove(dest);
	mkdirSync(dirname(dest), { recursive: true });

	const url = `https://github.com/${lib.repo}.git`;
	const run = (cmd: string[], cwd?: string) =>
		execFileSync("git", cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] });

	try {
		run(["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", lib.branch, url, dest]);
	} catch (err) {
		// A raw "Command failed: git clone …" tells you nothing about which of the
		// three likely causes it was, and this is the first thing that breaks when
		// a library is registered before its repo exists.
		const stderr = String((err as { stderr?: Buffer }).stderr ?? "");
		const reason = /not found|does not exist|Repository not found/i.test(stderr)
			? `no repository at ${url} — check the "repo" field, and note the GitHub name may differ from the folder name`
			: /Remote branch .* not found|couldn't find remote ref/i.test(stderr)
				? `repository exists but has no "${lib.branch}" branch — check the "branch" field`
				: `git clone failed: ${stderr.trim().split("\n").pop() ?? "unknown error"}`;
		throw new Error(`cannot fetch docs for "${lib.id}" — ${reason}.`);
	}

	run(["sparse-checkout", "set", lib.docsDir], dest);

	return dest;
}

/** Where this library's docs actually live on disk right now. */
function resolveSource(lib: Library): { root: string; origin: "local" | "clone" } {
	if (!REMOTE_ONLY && lib.local) {
		const localRoot = resolve(SITE_ROOT, lib.local);
		if (existsSync(join(localRoot, lib.docsDir))) {
			return { root: join(localRoot, lib.docsDir), origin: "local" };
		}
		if (existsSync(localRoot)) {
			notes.push(`${lib.id}: local checkout found but it has no "${lib.docsDir}/" yet — cloning instead.`);
		}
	}
	const cloned = cloneDocs(lib);
	return { root: join(cloned, lib.docsDir), origin: "clone" };
}

/** Resolve "overview" to an actual docs/overview.md or .mdx, or null. */
function resolvePageFile(docsRoot: string, slug: string): string | null {
	for (const ext of [".md", ".mdx"]) {
		const candidate = join(docsRoot, `${slug}${ext}`);
		if (existsSync(candidate) && lstatSync(candidate).isFile()) return candidate;
	}
	return null;
}

function listMarkdown(dir: string, prefix = ""): string[] {
	if (!existsSync(dir)) return [];
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) out.push(...listMarkdown(join(dir, entry.name), rel));
		else if (/\.mdx?$/.test(entry.name)) out.push(rel.replace(/\.mdx?$/, ""));
	}
	return out;
}

/**
 * A library with no docs/ yet still deserves a page. Synthesise a single
 * "Overview" from its README so registering a library is never a 404.
 */
function readmeFallback(lib: Library): DocsConfig | null {
	const roots = [
		!REMOTE_ONLY && lib.local ? resolve(SITE_ROOT, lib.local) : null,
		join(CLONE_DIR, lib.id),
	].filter((r): r is string => !!r);

	for (const root of roots) {
		const readme = join(root, "README.md");
		if (!existsSync(readme)) continue;

		const body = readFileSync(readme, "utf8").replace(/^﻿/, "");
		const target = join(DOCS_CACHE, lib.id);
		safeRemove(target);
		mkdirSync(target, { recursive: true });

		const frontmatter = [
			"---",
			`title: "Overview"`,
			`description: ${JSON.stringify(lib.tagline)}`,
			"---",
			"",
		].join("\n");

		// The README's own H1 duplicates the page title the layout renders.
		const withoutH1 = body.replace(/^#\s+.*\n+/, "");
		writeFileSync(join(target, "overview.md"), frontmatter + withoutH1, "utf8");

		notes.push(`${lib.id}: no docs/ directory — rendering README.md as a single Overview page.`);
		return { sections: [{ label: "Overview", children: [{ label: "Overview", to: "overview" }] }] };
	}
	return null;
}

/**
 * The resolved sidebar, written outside the (possibly symlinked) docs directory
 * so we never write into the user's actual repo.
 */
function writeManifest(lib: Library, config: DocsConfig, origin: string) {
	mkdirSync(MANIFEST_DIR, { recursive: true });
	writeFileSync(
		join(MANIFEST_DIR, `${lib.id}.json`),
		`${JSON.stringify({ library: lib.id, origin, ...config }, null, 2)}\n`,
		"utf8",
	);
}

// --- the sync saga -------------------------------------------------------
//
// One library's sync is a two-phase script: Resolve finds and validates the
// docs (or falls back to the README), Materialize writes them into the
// cache. Built once, then `run()` once per library with a fresh `{ lib }`
// input — independent runs, so a bad library never blocks the rest.

const syncLibrary = new Script<{ lib: Library }>({ name: "sync-library", silent: true })
	.addPhase("Resolve")
	.addStep({
		name: "locate source",
		handler: async ({ input }) => {
			const { root, origin } = resolveSource(input.lib);
			return { docsRoot: root, origin };
		},
	})
	.addStep({
		name: "load config",
		handler: async ({ input, ctx }) => {
			const { lib } = input;

			// --- no docs/ at all: fall back to the README --------------------------
			if (!existsSync(ctx.docsRoot)) {
				// Distinguish "this library has no docs yet" from "it has docs, but
				// they only exist on your machine". The second is the confusing
				// one: the build succeeds and quietly publishes a README where a
				// full manual should be.
				if (REMOTE_ONLY && lib.local) {
					const localDocs = join(resolve(SITE_ROOT, lib.local), lib.docsDir);
					if (existsSync(localDocs)) {
						const count = listMarkdown(localDocs).length;
						unpushed.push(
							`${lib.id}: ${count} page${count === 1 ? "" : "s"} exist in ${lib.local}/${lib.docsDir}/ ` +
								`but are not on ${lib.repo}@${lib.branch}.`,
						);
					}
				}

				const fallback = readmeFallback(lib);
				if (!fallback) {
					throw new Error(`no "${lib.docsDir}/" directory and no README.md to fall back to.`);
				}
				return { config: fallback, fallback: true as const };
			}

			// --- read and validate the contract -------------------------------------
			const configPath = join(ctx.docsRoot, "config.json");
			if (!existsSync(configPath)) {
				throw new Error(
					`${lib.docsDir}/ exists but has no config.json. ` +
						"The site needs it to build the sidebar — see the docs authoring guide.",
				);
			}

			const config = parseDocsConfig(JSON.parse(readFileSync(configPath, "utf8")), `${lib.id} docs/config.json`);

			const entries = internalEntries(config);
			const referenced = new Set(entries.map((e) => e.to));

			// A broken reference is a problem for the build, but not fatal to this
			// library's own materialize step — collect every one, then continue.
			for (const entry of entries) {
				if (!resolvePageFile(ctx.docsRoot, entry.to)) {
					problems.push(
						`${lib.id}: config.json points at "${entry.to}" but ${lib.docsDir}/${entry.to}.md does not exist.`,
					);
				}
			}

			for (const file of listMarkdown(ctx.docsRoot)) {
				if (!referenced.has(file)) {
					notes.push(
						`${lib.id}: ${lib.docsDir}/${file}.md is not referenced by config.json — it will not be published.`,
					);
				}
			}

			return { config, fallback: false as const };
		},
	})
	.addPhase("Materialize")
	.addStep({
		name: "write cache",
		handler: async ({ input, ctx }) => {
			const { lib } = input;

			// The README-fallback branch already wrote its own overview.md while
			// resolving; the real-docs branch still needs linking or copying in.
			if (!ctx.fallback) {
				const target = join(DOCS_CACHE, lib.id);
				safeRemove(target);
				mkdirSync(DOCS_CACHE, { recursive: true });
				if (FORCE_COPY || ctx.origin === "clone") {
					cpSync(ctx.docsRoot, target, { recursive: true, dereference: true });
				} else {
					symlinkSync(ctx.docsRoot, target, "dir");
				}
			}

			writeManifest(lib, ctx.config, ctx.origin);

			const linked = ctx.fallback ? "readme" : FORCE_COPY || ctx.origin === "clone" ? "copied" : "linked";
			return { pageCount: internalEntries(ctx.config).length, linked };
		},
		// A partial symlink/copy or manifest write shouldn't leave a broken cache
		// entry behind for the next run to trip over.
		rollback: async ({ input }) => {
			safeRemove(join(DOCS_CACHE, input.lib.id));
		},
	});

// --- main ------------------------------------------------------------------

const libraries = loadRegistry();

log(
	symbols.arrow,
	`${palette.bold(`Syncing ${libraries.length} librar${libraries.length === 1 ? "y" : "ies"}${REMOTE_ONLY ? " (remote)" : ""}`)}\n`,
);

safeRemove(DOCS_CACHE);
mkdirSync(DOCS_CACHE, { recursive: true });

for (const lib of libraries) {
	const result = await syncLibrary.run({ lib });

	if (!result.ok) {
		problems.push(`${lib.id}: ${errorMessage(result.error).split("\n")[0]}`);
		continue;
	}

	const timing = palette.faint(formatDuration(result.durationMs));

	if (result.ctx.fallback) {
		log(symbols.pending, `${lib.id.padEnd(12)} README fallback (1 page)  ${timing}`);
		continue;
	}

	const { pageCount, linked, origin } = result.ctx;
	log(
		symbols.success,
		`${lib.id.padEnd(12)} ${pageCount} page${pageCount === 1 ? "" : "s"} (${origin}, ${linked})  ${timing}`,
	);
}

if (notes.length) {
	process.stdout.write("\n");
	for (const note of notes) log(symbols.warning, note);
}

// Loud, because it is the difference between publishing your documentation and
// publishing a README with the same build exit code.
if (unpushed.length) {
	const bar = symbols.rule.repeat(74);
	process.stdout.write(`\n${bar}\n`);
	process.stdout.write("  DOCS NOT PUBLISHED — this build is using README fallbacks\n\n");
	for (const line of unpushed) process.stdout.write(`    • ${line}\n`);
	process.stdout.write(
		"\n  This build clones from GitHub. Commit and push each docs/ directory,\n" +
			"  or run `npm run build:local` to build from your local checkouts.\n",
	);
	process.stdout.write(`${bar}\n`);
}

if (problems.length) {
	process.stdout.write("\n");
	for (const problem of problems) log(symbols.failure, problem);
	process.stdout.write(`\n${problems.length} problem${problems.length === 1 ? "" : "s"} — build aborted.\n`);
	process.exit(1);
}

process.stdout.write("\nDocs synced.\n");
