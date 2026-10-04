import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetSession } from "src/types/WidgetSession";

/**
 * What `open` answers: a session, or the reason this adapter cannot work in
 * this runtime, such as the wrong platform. An unavailable adapter is an
 * answer, not an exception, so Frame moves on to the next adapter and, when
 * none is left, reports it in status and outcomes.
 *
 * @example
 * ```ts
 * const opening: WidgetOpening<StreakProps> = {
 *   status: "unavailable",
 *   reason: "Widgets need iOS.",
 *   remediation: "Run a development build on an iPhone.",
 * };
 * ```
 */
export type WidgetOpening<TData extends JsonRecord = JsonRecord> =
  | { status: "opened"; session: WidgetSession<TData> }
  | { status: "unavailable"; reason: string; remediation: string | null };
