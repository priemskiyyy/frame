import type { VoltraScheduledEntry } from "src/types/VoltraScheduledEntry";
import type { VoltraWidgetVariants } from "src/types/VoltraWidgetVariants";

/**
 * The part of `@use-voltra/ios-client` the adapter calls: pass `import * as
 * VoltraClient from "@use-voltra/ios-client"` itself. Off Apple every widget
 * function resolves without doing anything, so the adapter asks
 * `assertRunningOnApple` first.
 *
 * @example
 * ```ts
 * import * as VoltraClient from "@use-voltra/ios-client";
 *
 * const adapter = voltraPayloadWidget(streak, { sdk: VoltraClient, render });
 * ```
 */
export type VoltraIosClientLike = {
  assertRunningOnApple: () => boolean;
  updateWidget: (
    widgetId: string,
    variants: VoltraWidgetVariants,
  ) => Promise<void>;
  scheduleWidget: (
    widgetId: string,
    entries: VoltraScheduledEntry[],
  ) => Promise<void>;
  reloadWidgets: (widgetIds?: string[]) => Promise<void>;
};
