import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetData } from "src/types/WidgetData";
import type { Widgets } from "src/types/Widgets";

/**
 * An adapter for one of the widgets a Frame lists: its definition's name and
 * data are the listed definition's. An adapter for a widget the Frame does not
 * list is a type error.
 *
 * @example
 * ```ts
 * const adapters: WidgetAdapterOf<{ streak: typeof streak }>[] = [
 *   expoWidget(streak, { sdk: ExpoWidgets, render: StreakView }),
 * ];
 * ```
 */
export type WidgetAdapterOf<TWidgets extends Widgets> = {
  [TKey in keyof TWidgets]: WidgetAdapter<
    WidgetData<TWidgets[TKey]>,
    TWidgets[TKey]["name"]
  >;
}[keyof TWidgets];
