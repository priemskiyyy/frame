import type { HeldCall } from "src/mock/types/HeldCall";
import type { MockCall } from "src/mock/types/MockCall";
import type { MockPlan } from "src/mock/types/MockPlan";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";

/**
 * The test's side of a mock adapter: what it was asked, and how it answers next.
 *
 * @example
 * ```ts
 * const { adapter, control } = createMockAdapter(streak);
 *
 * control.script({ outcome: "hold" });
 * ```
 */
export type MockWidgetControl = {
  /** Plans the next calls, in order; an unplanned call succeeds. */
  script: (...plans: MockPlan[]) => void;
  /** Calls waiting on `hold`, oldest first. */
  held: () => HeldCall[];
  /** Every call received so far, with what Frame handed it. */
  calls: () => MockCall[];
  /** What the simulated provider holds: a succeeded publication or schedule. */
  stored: () => TimelineEntry<JsonRecord>[];
  /** Puts entries in place without a call, as another writer would. */
  seed: (entries: TimelineEntry<JsonRecord>[]) => void;
  /** Sessions opened and not yet disposed. */
  sessions: () => number;
};
