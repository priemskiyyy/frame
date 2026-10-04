import type { JsonRecord } from "src/types/JsonRecord";
import type { ReadbackAnswer } from "src/types/ReadbackAnswer";
import type { SubmissionResult } from "src/types/SubmissionResult";
import type { TimelineEntry } from "src/types/TimelineEntry";

/**
 * One opened adapter, called one method at a time per `writeDomain` with
 * frozen, validated data. Only `publish` is required: a method left out
 * answers `unavailable` on every handle, and `publish` and `publishTimeline`
 * are declared as methods so a session for one definition fits where any is
 * accepted.
 *
 * @example
 * ```ts
 * const session: WidgetSession<StreakProps> = {
 *   writeDomain: "expo:StreakWidget",
 *   publish: (data) => {
 *     widget.updateSnapshot(data);
 *     return { status: "submitted", evidence: "sdk-call-returned" };
 *   },
 *   reload: () => {
 *     widget.reload();
 *     return { status: "submitted", evidence: "sdk-call-returned" };
 *   },
 * };
 * ```
 */
export type WidgetSession<TData extends JsonRecord = JsonRecord> = {
  /**
   * Names the physical resource whose writes can overwrite one another, such
   * as `expo:StreakWidget`. Sessions with one write domain run their calls one
   * at a time.
   */
  writeDomain: string;
  /** Submits one value, which replaces the widget's content. */
  publish(data: TData): SubmissionResult | Promise<SubmissionResult>;
  /** Replaces the whole schedule at once. Frame hands it strictly increasing entries whose first one is not in the future. */
  publishTimeline?(
    entries: TimelineEntry<TData>[],
  ): SubmissionResult | Promise<SubmissionResult>;
  /** Asks the host to redraw. Answering `submitted` acknowledges the request, never a render. */
  reload?: (() => SubmissionResult | Promise<SubmissionResult>) | undefined;
  /** Reads back what the provider stores for the widget. */
  readback?: (() => ReadbackAnswer | Promise<ReadbackAnswer>) | undefined;
  /** Takes back what `open` set up, called once and nothing after it. Omit it when `open` set up nothing. */
  dispose?: (() => void | Promise<void>) | undefined;
};
