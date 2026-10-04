import type { PublicationOutcome } from "src/types/PublicationOutcome";
import type { WidgetKey } from "src/types/WidgetKey";
import type { Widgets } from "src/types/Widgets";

/**
 * What a context change did to each widget: with `reset: "fallback"` the
 * outcome of each fallback publication, with `reset: "preserve"` nothing. A
 * widget that failed or is unavailable is not erased.
 *
 * @example
 * ```ts
 * const { widgets } = await frame.context({ reset: "fallback" });
 * if (widgets.streak?.status !== "submitted") warnAboutStaleWidget();
 * ```
 */
export type FrameContextReport<TWidgets extends Widgets> = {
  widgets: Partial<Record<WidgetKey<TWidgets>, PublicationOutcome>>;
};
