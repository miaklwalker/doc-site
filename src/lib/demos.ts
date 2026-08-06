import BraidDemo from "../components/demos/BraidDemo.astro";
import BucketsDemo from "../components/demos/BucketsDemo.astro";
import SearchDemo from "../components/demos/SearchDemo.astro";
import StagehandDemo from "../components/demos/StagehandDemo.astro";
import StepQueueDemo from "../components/demos/StepQueueDemo.astro";

/**
 * Each library's bespoke, self-contained demo, keyed by library id. A library
 * with no entry here just renders without one — registering a library was
 * never supposed to require a demo.
 */
export const DEMOS: Partial<Record<string, typeof BucketsDemo>> = {
	buckets: BucketsDemo,
	"step-queue": StepQueueDemo,
	stagehand: StagehandDemo,
	search: SearchDemo,
	braid: BraidDemo,
};
