import type { FrameClock } from "src/types/FrameClock";
import type { FrameLimits } from "src/types/FrameLimits";
import type { WidgetAdapterOf } from "src/types/WidgetAdapterOf";
import type { Widgets } from "src/types/Widgets";

/**
 * Configuration of a `Frame`. Constructing one is cheap and calls no provider.
 *
 * @example
 * ```ts
 * const frame = new Frame({
 *   widgets: { streak },
 *   adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
 * });
 * ```
 */
export type FrameOptions<TWidgets extends Widgets = Widgets> = {
  /** What can be shown, by name. The same on every platform. */
  widgets: TWidgets;
  /**
   * What draws the widgets here, in order of preference: a widget is hosted
   * by the first of its adapters that can work in this runtime. Leave it out
   * where nothing can host them, such as the web, and every request answers
   * `unavailable`. An adapter for a definition `widgets` does not list is a
   * type error, and a configuration error where the types were widened.
   */
  adapters?: WidgetAdapterOf<TWidgets>[] | undefined;
  /**
   * How long one provider call may take before its request ends
   * `indeterminate` and its write domain stops taking work, in milliseconds.
   * It also bounds opening an adapter and an asynchronous schema's answer.
   * Defaults to 5000, at most 2147483647.
   */
  timeout?: number | undefined;
  limits?:
    | { [TName in keyof FrameLimits]?: FrameLimits[TName] | undefined }
    | undefined;
  /** The clock, for tests. Defaults to the system clock. */
  clock?: FrameClock | undefined;
};
