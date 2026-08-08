/**
 * Data shape for AnnotatedCode.astro: a hand-tokenized code sample where a
 * handful of tokens carry a doc id, and hovering/focusing one shows a
 * tooltip built from the matching entry in `docs`. Content lives in
 * `src/lib/annotated-examples/*` per library; the component only renders.
 */

/** A styled, non-interactive run of text. */
export type StyledSeg = {
	t: string;
	/** Syntax class: keyword or string literal. Omit for default text color. */
	c?: "kw" | "str";
};

/** A token that shows a tooltip on hover/focus, keyed into `docs`. */
export type HoverSeg = StyledSeg & { d: string };

/** Plain strings render as-is; objects opt into syntax color and/or a tooltip. */
export type Seg = string | StyledSeg | HoverSeg;

export type Line = {
	/** Indent level in the rendered snippet, one unit per nesting depth. */
	indent?: number;
	segs: Seg[];
};

export type DocEntry = {
	/** Short category shown above the title, e.g. "method", "option", "param". */
	kind: string;
	/** Signature-style heading, e.g. ".addPhase(name, options?)". */
	title: string;
	body: string;
	/**
	 * The resolved TS type at this exact point in the chain, e.g.
	 * "{ artifact: string; bytes: number }" for a ctx three steps in.
	 * Shown as a distinct type-preview line above `body`.
	 */
	type?: string;
	/** Slug (via `href()`) to the full reference/guide page for this API. */
	to?: string;
};

export type AnnotatedExample = {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	filename?: string;
	lines: Line[];
	docs: Record<string, DocEntry>;
};
