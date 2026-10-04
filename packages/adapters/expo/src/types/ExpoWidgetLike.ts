import type { JsonRecord } from "@priemskiyyy/frame/adapter";

/**
 * The part of the SDK's `Widget` object the adapter calls. A write stores to
 * the widget's shared storage and asks WidgetKit to reload, and none of the
 * methods reports when, or whether, the host redraws.
 *
 * @example
 * ```ts
 * const widget: ExpoWidgetLike<StreakProps> = sdk.createWidget("StreakWidget", StreakView);
 * ```
 */
export type ExpoWidgetLike<TData extends JsonRecord> = {
  reload: () => void;
  updateTimeline: (entries: { date: Date; props: TData }[]) => void;
  updateSnapshot: (props: TData) => void;
  getTimeline: () => Promise<{ date: Date; props: TData }[]>;
};
