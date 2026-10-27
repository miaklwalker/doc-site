import type { AnnotatedExample } from "../annotated-code.ts";

/**
 * One wizard fetched, edited twice, synced once through a bulk endpoint whose
 * response becomes the new base (real API). Uses pushMany alone so a lone
 * change still goes out as a batch of one and `receive` always applies —
 * keeps the sample honest without explaining the push/pushMany split inline.
 */
export const stageExample: AnnotatedExample = {
	eyebrow: "reference",
	title: "Two edits, one call",
	subtitle:
		"Every highlighted token is real Stage API — hover or tab to it to see what it does and where the types come from.",
	filename: "wizards.ts",
	docs: {
		Stage: {
			kind: "class",
			title: "Stage",
			body: "Holds every tracked value and knows how to sync each kind. Each .entity() call widens its type with a name, a value type and a key type, so tracking an entity you never registered is a compile error.",
			to: "reference/api",
		},
		entity: {
			kind: "method",
			title: ".entity(name, config)",
			body: "Registers one kind of entity and how to push it. Registering the same name twice fails to compile, and throws at runtime for JavaScript callers.",
			to: "guides/sync-adapters",
		},
		key: {
			kind: "option",
			title: "key",
			type: "(wizard: Wizard) => number",
			body: "The value's identity. Its parameter annotation is where Stage learns the value type, and its return type is the key type that .get() accepts. Keys can't change through update().",
			to: "guides/type-safety",
		},
		pushMany: {
			kind: "option",
			title: "pushMany",
			body: "Sends changes in batches. With only pushMany, a lone change goes out as a batch of one; add push alongside it and a lone change uses push instead.",
			to: "guides/sync-adapters",
		},
		max: {
			kind: "option",
			title: "max",
			body: "Caps the batch size. 120 dirty wizards with max: 50 go out as three calls of 50, 50 and 20. Defaults to no cap.",
			to: "guides/sync-adapters",
		},
		run: {
			kind: "option",
			title: "run(changes)",
			type: "changes: Change<Wizard, number>[]",
			body: "Makes the API call. Each change carries key, base, current, and patch — only the top-level fields that actually differ from base, so a reverted edit sends nothing.",
			to: "guides/sync-adapters",
		},
		receive: {
			kind: "option",
			title: "receive(response, changes)",
			type: "=> Iterable<Wizard>",
			body: "Reads the server's version out of the response. Each returned value is matched to its change by key, so the order doesn't matter, and becomes the new base. Without receive, what you sent becomes the base.",
			to: "guides/reading-responses",
		},
		track: {
			kind: "method",
			title: '.track("wizard", value)',
			type: "Staged<Wizard, number>",
			body: "Starts tracking a value and returns its handle. The value is copied and deep-frozen, so the only way to change it is update().",
			to: "reference/api",
		},
		update: {
			kind: "method",
			title: ".update(recipe)",
			body: "Applies an Immer recipe locally. Nothing is sent. Assigning a house that isn't in the union fails to compile inside the draft.",
			to: "quick-start",
		},
		fields: {
			kind: "property",
			title: "tom.change?.fields",
			type: '("name" | "house")[]',
			body: "The pending change, worked out by diffing against base. Two edits to the same field collapse to one; an edit you undo by hand drops out entirely.",
			to: "reference/api",
		},
		sync: {
			kind: "method",
			title: "stage.sync()",
			body: "Pushes every dirty value, grouped per entity into as few calls as push/pushMany allow. Syncs queue behind each other, and edits made while one is in flight stay dirty for the next.",
			to: "guides/edits-during-sync",
		},
		SyncError: {
			kind: "class",
			title: "SyncError",
			body: "Thrown once every push has been attempted. failures lists each call that failed and the keys it carried; those values stay dirty, so calling sync() again retries exactly what didn't make it.",
			to: "guides/failures-and-retries",
		},
		get: {
			kind: "method",
			title: '.get("wizard", key)',
			type: "Staged<Wizard, number> | undefined",
			body: "Finds the same handle anywhere else in the program. The key must be a number here, because that's what key returns.",
			to: "reference/api",
		},
	},
	lines: [
		{
			segs: [
				{ t: "import", c: "kw" },
				" { Stage, SyncError } ",
				{ t: "from", c: "kw" },
				" ",
				{ t: '"@michaelrwalker/stage"', c: "str" },
				";",
			],
		},
		{ segs: [] },
		{
			segs: [
				{ t: "const", c: "kw" },
				" stage = ",
				{ t: "new", c: "kw" },
				" ",
				{ t: "Stage", d: "Stage" },
				"()",
				{ t: ".entity", d: "entity" },
				"(",
				{ t: '"wizard"', c: "str" },
				", {",
			],
		},
		{ indent: 1, segs: [{ t: "key", d: "key" }, ": (wizard: Wizard) => wizard.id,"] },
		{ indent: 1, segs: [{ t: "pushMany", d: "pushMany" }, ": {"] },
		{ indent: 2, segs: [{ t: "max", d: "max" }, ": 50,"] },
		{ indent: 2, segs: [{ t: "run", d: "run" }, ": (changes) =>"] },
		{
			indent: 3,
			segs: [
				"api.post(",
				{ t: '"/wizards/bulk"', c: "str" },
				", changes.map((c) => ({ id: c.key, ...c.patch }))),",
			],
		},
		{ indent: 2, segs: [{ t: "receive", d: "receive" }, ": (response) => response.wizards,"] },
		{ indent: 1, segs: ["},"] },
		{ segs: ["});"] },
		{ segs: [] },
		{
			segs: [
				{ t: "const", c: "kw" },
				" tom = stage.",
				{ t: "track", d: "track" },
				"(",
				{ t: '"wizard"', c: "str" },
				", ",
				{ t: "await", c: "kw" },
				" api.get(",
				{ t: '"/wizards/1"', c: "str" },
				"));",
			],
		},
		{ segs: [] },
		{ segs: ["tom.", { t: "update", d: "update" }, "((draft) => {"] },
		{ indent: 1, segs: ["draft.name = ", { t: '"lord voldemort"', c: "str" }, ";"] },
		{ segs: ["});"] },
		{ segs: ["tom.", { t: "update", d: "update" }, "((draft) => {"] },
		{ indent: 1, segs: ["draft.house = ", { t: '"slytherin"', c: "str" }, ";"] },
		{ segs: ["});"] },
		{ segs: [] },
		{ segs: ["tom.change?.", { t: "fields", d: "fields" }, ';  // ["name", "house"] — nothing sent yet'] },
		{ segs: [] },
		{ segs: [{ t: "try", c: "kw" }, " {"] },
		{
			indent: 1,
			segs: [
				{ t: "await", c: "kw" },
				" stage.",
				{ t: "sync", d: "sync" },
				"();  // one POST, and the response becomes the new base",
			],
		},
		{ segs: ["} ", { t: "catch", c: "kw" }, " (error) {"] },
		{
			indent: 1,
			segs: [
				{ t: "if", c: "kw" },
				" (error ",
				{ t: "instanceof", c: "kw" },
				" ",
				{ t: "SyncError", d: "SyncError" },
				") console.error(error.failures);",
			],
		},
		{ segs: ["}"] },
		{ segs: [] },
		{
			segs: [
				"stage.",
				{ t: "get", d: "get" },
				"(",
				{ t: '"wizard"', c: "str" },
				', 1)?.value.name;  // "lord voldemort"',
			],
		},
	],
};
