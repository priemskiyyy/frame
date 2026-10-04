import type { JsonRecord } from "src/types/JsonRecord";

/**
 * One presentation of a timeline: what to show from `at` on.
 *
 * @example
 * ```ts
 * const entry: TimelineEntry<{ days: number }> = { at: Date.now(), data: { days: 12 } };
 * ```
 */
export type TimelineEntry<TData extends JsonRecord> = {
  /** Epoch milliseconds, a safe integer. */
  at: number;
  data: TData;
};
