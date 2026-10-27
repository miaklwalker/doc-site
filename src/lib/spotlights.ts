import type { AnnotatedExample } from "./annotated-code.ts";
import { braidExample } from "./annotated-examples/braid.ts";
import { bucketsExample } from "./annotated-examples/buckets.ts";
import { journalExample } from "./annotated-examples/journal.ts";
import { searchExample } from "./annotated-examples/search.ts";
import { stageExample } from "./annotated-examples/stage.ts";
import { stagehandExample } from "./annotated-examples/stagehand.ts";
import { stepQueueExample } from "./annotated-examples/step-queue.ts";

/**
 * Per-library hover-annotated code example for the library landing page,
 * keyed by library id. A library with no entry here just skips the section —
 * same opt-in shape as DEMOS in demos.ts.
 */
export const SPOTLIGHTS: Partial<Record<string, AnnotatedExample>> = {
	stagehand: stagehandExample,
	buckets: bucketsExample,
	"step-queue": stepQueueExample,
	braid: braidExample,
	search: searchExample,
	stage: stageExample,
	journal: journalExample,
};
