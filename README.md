# doc-site

The documentation site for the `@michaelrwalker` libraries.

This repo contains **no documentation content**. It holds a registry of
libraries and the machinery to render them. Every doc page is written and
versioned inside the library it describes, and pulled in at build time.

```
buckets/docs/        ─┐
step-queue/docs/     ─┤
stagehand/docs/      ─┼─► scripts/sync-docs.ts ─► docs-cache/ ─► Astro ─► GitHub Pages
search/docs/         ─┤
braid/docs/          ─┘
```

Adding a library is an entry in [`libraries.json`](./libraries.json). Adding a
page is a markdown file in that library's own repo. See
[AUTHORING.md](./AUTHORING.md) for both.

## Running it

```bash
npm install
npm run dev
```

`npm run dev` syncs docs first. Any library with a `local` path in
`libraries.json` is **symlinked** from your checkout on disk, so editing
`../buckets/docs/overview.md` updates the dev server live. Libraries without a
local checkout are cloned.

| Command | What it does |
| --- | --- |
| `npm run dev` | Sync (local where possible) and start the dev server |
| `npm run sync` | Sync only, preferring local checkouts |
| `npm run sync:remote` | Sync only, always cloning — what CI does |
| `npm run build` | Clone all docs, build, and index with Pagefind |
| `npm run build:local` | Same, but prefers local checkouts |
| `npm run preview` | Serve the built site |

Search is powered by Pagefind, which indexes the built HTML. It therefore only
works against a real build — in `npm run dev` the search modal says so rather
than failing silently.

## How the sync works

`scripts/sync-docs.ts` reads `libraries.json` and, for each library:

1. Resolves the docs directory — a local checkout in dev, otherwise a
   `--depth 1 --filter=blob:none --sparse` clone that fetches only `docs/`.
   Public repos, so no token is involved.
2. Validates `docs/config.json` against the contract in AUTHORING.md, checking
   that every referenced page exists. **Broken references fail the build**, so
   a page renamed in a library repo cannot silently vanish from the site.
3. Materialises the docs under `docs-cache/<id>/` and writes the resolved
   sidebar to `docs-cache/__manifests/<id>.json`.

A library with no `docs/` directory falls back to rendering its `README.md` as
a single Overview page, so registering a library is never a 404.

`docs-cache/` and `.clones/` are generated and gitignored. Nothing in this repo
ever writes into a library's own directory — the nav manifest is deliberately
kept outside the (possibly symlinked) docs folder for exactly that reason.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Because docs
live in other repos, the workflow also runs daily and can be triggered manually
or by `repository_dispatch` from a library repo.

The site is served from a subpath (`/doc-site/`), so **never hardcode an
internal link**. Use the `href()` helper in `src/lib/links.ts`, which is the one
place that knows about the base path.

## A note on the directory name

This folder's name contains a `:` at the POSIX level (Finder displays it as
`/`). `PATH` is colon-separated, so npm's injection of `node_modules/.bin`
gets split in half and bare binary names do not resolve. Every script therefore
invokes binaries by path (`./node_modules/.bin/astro`). If you ever rename the
directory to something without a colon, the explicit paths keep working.
