# Writing docs for a library

Documentation lives in the library's own repository, not here. This site holds a
registry of libraries and renders whatever it finds in each one. Docs are
reviewed in the same pull request as the code they describe.

## The shape of a library's docs

```
your-library/
├── docs/
│   ├── config.json          # required — declares the sidebar
│   ├── overview.md
│   ├── installation.md
│   └── guides/
│       └── advanced.md
├── src/
└── package.json
```

## `docs/config.json`

This declares the sidebar, the page order, and the labels. It is the only thing
that decides what gets published — a markdown file not referenced here is
ignored.

```json
{
  "sections": [
    {
      "label": "Getting Started",
      "children": [
        { "label": "Overview", "to": "overview" },
        { "label": "Installation", "to": "installation" }
      ]
    },
    {
      "label": "Guides",
      "children": [
        { "label": "Advanced usage", "to": "guides/advanced", "badge": "new" },
        { "label": "Changelog", "href": "https://github.com/you/your-library/releases" }
      ]
    }
  ]
}
```

| Field | Where | Meaning |
| --- | --- | --- |
| `label` | section, entry | Text shown in the sidebar. Required. |
| `to` | entry | Path under `docs/`, **no file extension**. `"guides/advanced"` → `docs/guides/advanced.md`. |
| `href` | entry | External URL instead of a page. Mutually exclusive with `to`. |
| `badge` | entry | Optional short tag rendered beside the label. |
| `collapsed` | section | Render the section collapsed by default. |

Ordering comes from this file, so reordering the sidebar never means renaming a
file.

### Rules the build enforces

The site build fails — loudly, rather than silently dropping pages — if:

- a `to` points at a file that does not exist
- an entry has both `to` and `href`, or neither
- `to` includes a file extension, starts with `/`, or contains `..`
- a section has no children

A markdown file that exists but is not referenced produces a warning, not a
failure. It just will not be published.

## Page format

````markdown
---
title: "Installation"
description: "One sentence, used for the page lede and SEO."
---

Install the package:

```bash
npm install your-library
```

## First steps

Body text.
````

- `title` and `description` are the only frontmatter fields that matter. `draft: true` hides a page from search.
- **Do not write an H1.** The layout renders `title` as the page's `<h1>`; start body headings at `##`.
- `##` and `###` become the "On this page" rail. `####` and deeper render but stay out of the rail.
- Always tag code fences with a language.
- `.mdx` works if you need components.

If `title` is omitted the sidebar label is used instead, so a missing title
degrades gracefully rather than rendering an empty heading.

## No docs yet?

A registered library with no `docs/` directory is not an error. The site renders
its `README.md` as a single "Overview" page until real docs exist.

## Registering a new library

Add an entry to [`libraries.json`](./libraries.json) in this repo:

```json
{
  "id": "your-library",
  "name": "Your Library",
  "package": "@michaelrwalker/your-library",
  "repo": "miaklwalker/your-library",
  "branch": "main",
  "docsDir": "docs",
  "local": "../your-library",
  "tagline": "One line for the card and page description.",
  "description": "A longer blurb for the library landing page.",
  "accent": "#0ea5e9",
  "accentDark": "#38bdf8"
}
```

- `id` becomes the URL segment (`/doc-site/your-library/...`) and must be
  lowercase with dashes.
- `repo` is case-sensitive — it is used verbatim to clone.
- `local` is a path relative to this repo, used only in development. If the
  folder is there, `npm run dev` reads docs straight from it so you can edit and
  see changes live. If it is missing, the library is cloned instead.
- `accent` / `accentDark` colour that library's pages in light and dark mode.

## Publishing a docs change

Push to the library's `main`. The site rebuilds:

- on its daily schedule, or
- when you hit **Run workflow** on the Deploy docs action, or
- immediately, if you add the dispatch workflow below.

### Optional: rebuild immediately on docs changes

This needs a fine-grained personal access token with **Contents: read and
write** on the docs site repo, stored as a secret named `DOCS_SITE_TOKEN` in the
library repo. Create the token yourself — it is the one credential this setup
needs, and it is only worth it if the daily rebuild is too slow for you.

```yaml
# .github/workflows/notify-docs.yml, in the library repo
name: Rebuild docs site

on:
  push:
    branches: [main]
    paths: ["docs/**"]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch to docs site
        run: |
          curl -fsSL -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.DOCS_SITE_TOKEN }}" \
            https://api.github.com/repos/miaklwalker/doc-site/dispatches \
            -d '{"event_type":"docs-updated"}'
```
