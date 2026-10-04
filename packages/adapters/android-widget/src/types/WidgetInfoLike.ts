/**
 * One placed widget as the SDK reports it: its id, its size and the device's
 * screen. It mirrors the SDK's `WidgetInfo`, so a render function written
 * against the SDK's own type is accepted.
 *
 * @example
 * ```ts
 * const isWide = (placement: WidgetInfoLike) => placement.width > placement.height;
 * ```
 */
export type WidgetInfoLike = {
  widgetName: string;
  widgetId: number;
  height: number;
  width: number;
  screenInfo: {
    screenHeightDp: number;
    screenWidthDp: number;
    density: number;
    densityDpi: number;
  };
};
