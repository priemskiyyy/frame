import type { JsonRecord } from "src/types/JsonRecord";
import type { RequestFailure } from "src/types/RequestFailure";
import type { TimelineEntry } from "src/types/TimelineEntry";

/**
 * How one `readback` ended. `entries` hold only what the definition's
 * schema accepted; `rejected` counts what it did not, such as data written by
 * an older build.
 *
 * @example
 * ```ts
 * const outcome = await widget.readback();
 * if (outcome.status === "read") console.log(outcome.entries.length, outcome.rejected);
 * ```
 */
export type ReadbackOutcome<TData extends JsonRecord> = {
  request: { id: string };
} & (
  | { status: "read"; entries: TimelineEntry<TData>[]; rejected: number }
  | RequestFailure
);
