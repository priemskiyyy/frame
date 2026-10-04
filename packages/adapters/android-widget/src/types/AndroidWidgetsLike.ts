import type { WidgetInfoLike } from "src/types/WidgetInfoLike";
import type { WidgetRepresentationLike } from "src/types/WidgetRepresentationLike";

/**
 * The part of the `react-native-android-widget` module the adapter calls: pass
 * `import * as AndroidWidgets from "react-native-android-widget"` itself.
 * Neither function reports when, or whether, the launcher redraws.
 *
 * @example
 * ```ts
 * import * as AndroidWidgets from "react-native-android-widget";
 *
 * const adapter = androidWidget(streak, {
 *   sdk: AndroidWidgets,
 *   render: StreakView,
 *   available: () => Platform.OS === "android",
 * });
 * ```
 */
export type AndroidWidgetsLike = {
  getWidgetInfo: (widgetName: string) => Promise<WidgetInfoLike[]>;
  requestWidgetUpdateById: (request: {
    widgetName: string;
    widgetId: number;
    renderWidget: (
      placement: WidgetInfoLike,
    ) => Promise<WidgetRepresentationLike> | WidgetRepresentationLike;
  }) => Promise<void>;
};
