import type { AnnotatedExample } from "../annotated-code.ts";

/**
 * The case Journal exists for (real API): snapshot every product, save, run a
 * bulk price change, and roll back from the saved snapshot when it fails
 * partway. Mirrors the docs' quick start so the hover links land on pages that
 * tell the same story.
 */
export const journalExample: AnnotatedExample = {
	eyebrow: "reference",
	title: "Snapshot, change, roll back",
	subtitle:
		"Every highlighted token is real Journal API — hover or tab to it to see what it does and what it's typed as.",
	filename: "reprice.ts",
	docs: {
		Journal: {
			kind: "class",
			title: "Journal",
			body: "A typed, file-backed record of entries keyed by id. The entry type, the id type and idKey's parameter all come from the schema, so the script never writes a type annotation.",
			to: "reference/api",
		},
		path: {
			kind: "option",
			title: "path",
			body: "The JSON file to read and write. Parent directories are created on save, so a script's first run needs no setup.",
			to: "guides/saving",
		},
		schema: {
			kind: "option",
			title: "schema",
			body: "Any Standard Schema validator — Zod, Valibot, ArkType, or one you write by hand. Every write validates against it, and so does every entry read back from the file.",
			to: "guides/schemas",
		},
		idKey: {
			kind: "option",
			title: "idKey",
			type: "(product: { id: string; title: string; price: number }) => string",
			body: "Gives an entry its identity. The parameter is inferred from the schema; the return type becomes the id type every other method accepts.",
			to: "guides/type-safety",
		},
		load: {
			kind: "method",
			title: ".load()",
			type: "Promise<Journal<…>>",
			body: "Reads, version-checks, migrates and validates the file, then resolves to the journal itself. A missing file loads as an empty journal. Every other method throws until this has finished.",
			to: "guides/saving",
		},
		upsertEntry: {
			kind: "method",
			title: ".upsertEntry(entry)",
			body: "Adds the entry if it's new, otherwise merges it over the existing one. Entries are cloned on the way in, so editing the object afterwards can't edit the snapshot.",
			to: "guides/snapshot-and-revert",
		},
		save: {
			kind: "method",
			title: ".save()",
			body: "Writes the working set to a temporary file and renames it into place, so a crash mid-write leaves the previous journal intact. Once it resolves, the old prices survive the process dying on the next line.",
			to: "guides/saving",
		},
		getEntries: {
			kind: "method",
			title: ".getEntries()",
			body: "Every working entry, in insertion order, as clones — mutating one doesn't touch the journal.",
			to: "guides/snapshot-and-revert",
		},
		getIds: {
			kind: "method",
			title: ".getIds()",
			type: "string[]",
			body: "Every working id, in insertion order.",
			to: "guides/snapshot-and-revert",
		},
		getSavedEntry: {
			kind: "method",
			title: ".getSavedEntry(id)",
			type: "{ id: string; title: string; price: number } | undefined",
			body: "The entry as of the last load() or save(), whatever has happened to the working set since. That's the undo. Pass an id or a whole entry.",
			to: "guides/snapshot-and-revert",
		},
		reset: {
			kind: "method",
			title: ".reset()",
			body: "Empties the journal and saves the empty file, so a later run doesn't mistake old snapshots for current ones.",
			to: "guides/saving",
		},
	},
	lines: [
		{
			segs: [
				{ t: "import", c: "kw" },
				" { Journal } ",
				{ t: "from", c: "kw" },
				" ",
				{ t: '"@michaelrwalker/journal"', c: "str" },
				";",
			],
		},
		{
			segs: [{ t: "import", c: "kw" }, " { z } ", { t: "from", c: "kw" }, " ", { t: '"zod"', c: "str" }, ";"],
		},
		{ segs: [] },
		{
			segs: [
				{ t: "const", c: "kw" },
				" journal = ",
				{ t: "await", c: "kw" },
				" ",
				{ t: "new", c: "kw" },
				" ",
				{ t: "Journal", d: "Journal" },
				"({",
			],
		},
		{ indent: 1, segs: [{ t: "path", d: "path" }, ": ", { t: '"./journal/products.json"', c: "str" }, ","] },
		{
			indent: 1,
			segs: [
				{ t: "schema", d: "schema" },
				": z.object({ id: z.string(), title: z.string(), price: z.number() }),",
			],
		},
		{ indent: 1, segs: [{ t: "idKey", d: "idKey" }, ": (product) => product.id,"] },
		{ segs: ["})", { t: ".load", d: "load" }, "();"] },
		{ segs: [] },
		{ segs: ["// Snapshot first, and save before the risky part."] },
		{
			segs: [
				{ t: "for", c: "kw" },
				" (",
				{ t: "const", c: "kw" },
				" product ",
				{ t: "of", c: "kw" },
				" ",
				{ t: "await", c: "kw" },
				" shop.listProducts()) {",
			],
		},
		{ indent: 1, segs: ["journal.", { t: "upsertEntry", d: "upsertEntry" }, "(product);"] },
		{ segs: ["}"] },
		{ segs: [{ t: "await", c: "kw" }, " journal.", { t: "save", d: "save" }, "();"] },
		{ segs: [] },
		{ segs: [{ t: "try", c: "kw" }, " {"] },
		{
			indent: 1,
			segs: [
				{ t: "for", c: "kw" },
				" (",
				{ t: "const", c: "kw" },
				" product ",
				{ t: "of", c: "kw" },
				" journal.",
				{ t: "getEntries", d: "getEntries" },
				"()) {",
			],
		},
		{
			indent: 2,
			segs: [{ t: "await", c: "kw" }, " shop.updateProduct(product.id, { price: product.price * 0.8 });"],
		},
		{ indent: 1, segs: ["}"] },
		{ segs: ["} ", { t: "catch", c: "kw" }, " {"] },
		{ indent: 1, segs: ["// Failed partway: put every product back the way it was."] },
		{
			indent: 1,
			segs: [
				{ t: "for", c: "kw" },
				" (",
				{ t: "const", c: "kw" },
				" id ",
				{ t: "of", c: "kw" },
				" journal.",
				{ t: "getIds", d: "getIds" },
				"()) {",
			],
		},
		{
			indent: 2,
			segs: [
				{ t: "const", c: "kw" },
				" before = journal.",
				{ t: "getSavedEntry", d: "getSavedEntry" },
				"(id);",
			],
		},
		{
			indent: 2,
			segs: [{ t: "if", c: "kw" }, " (before) ", { t: "await", c: "kw" }, " shop.updateProduct(id, before);"],
		},
		{ indent: 1, segs: ["}"] },
		{ segs: ["}"] },
		{ segs: [] },
		{
			segs: [
				{ t: "await", c: "kw" },
				" journal.",
				{ t: "reset", d: "reset" },
				"();  // done and verified: clear the snapshot",
			],
		},
	],
};
