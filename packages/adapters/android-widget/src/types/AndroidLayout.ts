import type { JsonRecord } from "@priemskiyyy/frame/adapter";

import type { WidgetInfoLike } from "src/types/WidgetInfoLike";
import type { WidgetRepresentationLike } from "src/types/WidgetRepresentationLike";

/**
 * A render function for Android widgets: it receives the published data and
 * one placed widget, and answers the tree to draw there, built from the SDK's
 * primitives such as `FlexWidget` and `TextWidget`. It runs once for each
 * placed widget, synchronously, before the SDK is asked to draw anything.
 *
 * @example
 * ```tsx
 * const StreakView: AndroidLayout<StreakProps> = (data, placement) => (
 *   <TextWidget text={`${data.days} days on ${placement.width} wide`} />
 * );
 * ```
 */
export type AndroidLayout<TData extends JsonRecord> = (
  data: TData,
  placement: WidgetInfoLike,
) => WidgetRepresentationLike;
