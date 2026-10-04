import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";

/**
 * One call a mock session received, with exactly what Frame handed it.
 *
 * @example
 * ```ts
 * const [call] = control.calls();
 * if (call?.operation === "publish") console.log(call.data);
 * ```
 */
export type MockCall =
  | { operation: "publish"; data: JsonRecord }
  | { operation: "publishTimeline"; entries: TimelineEntry<JsonRecord>[] }
  | { operation: "reload" }
  | { operation: "readback" };
