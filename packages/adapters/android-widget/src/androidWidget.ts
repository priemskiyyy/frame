import type {
  JsonRecord,
  WidgetAdapter,
  WidgetDefinition,
} from "@priemskiyyy/frame/adapter";

import type { AndroidWidgetOptions } from "src/types/AndroidWidgetOptions";
import {
  NOT_AVAILABLE_REASON,
  NOT_AVAILABLE_REMEDIATION,
} from "src/utils/constants/unavailable";
import { WRITE_DOMAIN_PREFIX } from "src/utils/constants/writeDomain";
import { publishToPlacements } from "src/utils/publishToPlacements";

/**
 * Draws a widget definition as the Android home screen widgets of one kind
 * through the `react-native-android-widget` you inject: a publication lists
 * the placed widgets, renders each with `render`, and updates each by id. It
 * answers `sdk-call-returned` because the SDK does not await the native draw,
 * and `skipped` when none is placed.
 *
 * @example
 * ```tsx
 * import * as AndroidWidgets from "react-native-android-widget";
 *
 * const frame = new Frame({
 *   widgets: { streak },
 *   adapters: [
 *     androidWidget(streak, {
 *       sdk: AndroidWidgets,
 *       render: StreakView,
 *       available: () => Platform.OS === "android",
 *     }),
 *   ],
 * });
 * ```
 */
export const androidWidget = <TName extends string, TData extends JsonRecord>(
  definition: WidgetDefinition<TName, TData>,
  { sdk, render, available }: AndroidWidgetOptions<NoInfer<TData>>,
): WidgetAdapter<TData, TName> => ({
  name: "android-widget",
  definition,
  open: () => {
    if (!available()) {
      return {
        status: "unavailable",
        reason: NOT_AVAILABLE_REASON,
        remediation: NOT_AVAILABLE_REMEDIATION,
      };
    }

    return {
      status: "opened",
      session: {
        writeDomain: `${WRITE_DOMAIN_PREFIX}${definition.name}`,
        publish: (data) =>
          publishToPlacements({ sdk, name: definition.name, render, data }),
      },
    };
  },
});
