import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";

/**
 * What an adapter found stored for its widget. Entries are raw: Frame parses
 * each one with the definition's schema before anyone sees it.
 *
 * @example
 * ```ts
 * readback: async () => ({
 *   status: "read",
 *   entries: (await widget.getTimeline()).map(({ date, props }) => ({ at: date.getTime(), data: props })),
 * });
 * ```
 */
export type ReadbackAnswer =
  | { status: "read"; entries: TimelineEntry<JsonRecord>[] }
  | { status: "failed"; error: Error };
