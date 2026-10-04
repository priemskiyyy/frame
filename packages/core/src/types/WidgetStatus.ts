import type { PublicationOutcome } from "src/types/PublicationOutcome";
import type { WidgetDesired } from "src/types/WidgetDesired";
import type { WidgetLifecycle } from "src/types/WidgetLifecycle";
import type { WidgetWork } from "src/types/WidgetWork";

/**
 * What Frame knows about one widget, and nothing it cannot know: there is no
 * `visible` and no `renderedAt`. A new object only when a field changes, so it
 * is safe to read during render.
 *
 * @example
 * ```ts
 * const { lifecycle, desired, work, latest } = widget.status.get();
 * ```
 */
export type WidgetStatus = {
  lifecycle: WidgetLifecycle;
  desired: WidgetDesired;
  work: WidgetWork;
  /** The last settled outcome that was not `superseded`, or `null` before one. */
  latest: PublicationOutcome | null;
};
