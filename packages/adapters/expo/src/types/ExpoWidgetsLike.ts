import type { JsonRecord } from "@priemskiyyy/frame/adapter";

import type { ExpoLayout } from "src/types/ExpoLayout";
import type { ExpoWidgetLike } from "src/types/ExpoWidgetLike";

/**
 * The part of the `expo-widgets` module the adapter calls: pass `import * as
 * ExpoWidgets from "expo-widgets"` itself. `widgetsDirectory` is empty where
 * the module has no native side, and `null` where no shared directory is
 * available.
 *
 * @example
 * ```ts
 * import * as ExpoWidgets from "expo-widgets";
 *
 * const adapter = expoWidget(streak, { sdk: ExpoWidgets, render: StreakView });
 * ```
 */
export type ExpoWidgetsLike<TData extends JsonRecord> = {
  widgetsDirectory: string | null;
  createWidget: (
    name: string,
    layout: ExpoLayout<TData>,
  ) => ExpoWidgetLike<TData>;
};
