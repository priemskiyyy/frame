import type { WidgetDesired } from "src/types/WidgetDesired";
import type { WidgetLifecycle } from "src/types/WidgetLifecycle";
import type { WidgetWork } from "src/types/WidgetWork";

/**
 * One widget in a diagnostics snapshot: the facts, never the data.
 *
 * @example
 * ```ts
 * const { widgets } = frame.diagnostics.get();
 * console.log(widgets.streak?.lifecycle);
 * ```
 */
export type WidgetSummary = {
  /** The definition's native name. */
  name: string;
  /** The adapter hosting the widget, or `null` before one opened and where none can. */
  adapter: { name: string } | null;
  lifecycle: WidgetLifecycle["state"];
  desired: WidgetDesired;
  work: WidgetWork;
  /** The status of the last settled outcome that was not `superseded`, or `null`. */
  latest: string | null;
};
