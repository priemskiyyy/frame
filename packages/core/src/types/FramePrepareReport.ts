import type { WidgetKey } from "src/types/WidgetKey";
import type { WidgetPreparation } from "src/types/WidgetPreparation";
import type { Widgets } from "src/types/Widgets";

/**
 * What `frame.prepare()` found, per widget.
 *
 * @example
 * ```ts
 * const report = await frame.prepare();
 * const ready = Object.values(report.widgets).every(({ status }) => status === "ready");
 * ```
 */
export type FramePrepareReport<TWidgets extends Widgets> = {
  widgets: Record<WidgetKey<TWidgets>, WidgetPreparation>;
};
