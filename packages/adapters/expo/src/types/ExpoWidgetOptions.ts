import type { JsonRecord } from "@priemskiyyy/frame/adapter";

import type { ExpoLayout } from "src/types/ExpoLayout";
import type { ExpoWidgetsLike } from "src/types/ExpoWidgetsLike";

/**
 * Options of `expoWidget`.
 *
 * @example
 * ```ts
 * const options: ExpoWidgetOptions<StreakProps> = { sdk: ExpoWidgets, render: StreakView };
 * ```
 */
export type ExpoWidgetOptions<TData extends JsonRecord> = {
  /** The `expo-widgets` module the application imported. Frame never configures it. */
  sdk: ExpoWidgetsLike<TData>;
  /** The widget's layout, marked with the `'widget'` directive. It is handed to the SDK as it is. */
  render: ExpoLayout<TData>;
};
