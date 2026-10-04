import type { WidgetDefinition } from "src/types/WidgetDefinition";

/**
 * The widgets one Frame owns, by the name the application uses for each. Each
 * name becomes a valid argument of `frame.widget()`, and its handle carries
 * the definition's data type.
 *
 * @example
 * ```ts
 * const widgets = { streak } satisfies Widgets;
 * ```
 */
export type Widgets = Record<string, WidgetDefinition>;
