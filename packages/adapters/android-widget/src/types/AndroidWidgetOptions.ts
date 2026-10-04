import type { JsonRecord } from "@priemskiyyy/frame/adapter";

import type { AndroidLayout } from "src/types/AndroidLayout";
import type { AndroidWidgetsLike } from "src/types/AndroidWidgetsLike";

/**
 * Options of `androidWidget`.
 *
 * @example
 * ```ts
 * const options: AndroidWidgetOptions<StreakProps> = {
 *   sdk: AndroidWidgets,
 *   render: StreakView,
 *   available: () => Platform.OS === "android",
 * };
 * ```
 */
export type AndroidWidgetOptions<TData extends JsonRecord> = {
  /** The `react-native-android-widget` module the application imported. Frame never configures it. */
  sdk: AndroidWidgetsLike;
  /** Draws the data for one placed widget. Frame calls it, not the SDK, so a throw is known to precede any native call. */
  render: AndroidLayout<TData>;
  /**
   * Whether this runtime can use the SDK, asked each time Frame opens the
   * adapter. The SDK has no platform probe of its own, and off Android it
   * lists no widgets, which would read as `skipped` forever, so the
   * application answers, such as `() => Platform.OS === "android"`.
   */
  available: () => boolean;
};
