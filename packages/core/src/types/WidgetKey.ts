import type { Widgets } from "src/types/Widgets";

/**
 * The names an application registered its widgets under.
 *
 * @example
 * ```ts
 * const key: WidgetKey<typeof widgets> = "streak";
 * ```
 */
export type WidgetKey<TWidgets extends Widgets> = keyof TWidgets & string;
