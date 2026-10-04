import type { WidgetSummary } from "src/types/WidgetSummary";

/**
 * A frozen view of the whole Frame for logs and devtools. It names widgets and
 * counts contexts, and never carries a value a widget shows.
 *
 * @example
 * ```ts
 * const { state, epoch, widgets } = frame.diagnostics.get();
 * const streak = widgets.streak;
 * ```
 */
export type FrameSnapshot<TKey extends string = string> = {
  state: "active" | "disposed";
  /** Counts contexts, from 1: the first starts when the Frame is made. */
  epoch: number;
  widgets: Record<TKey, WidgetSummary>;
};
