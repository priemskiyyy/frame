/**
 * A widget size family Voltra renders for. It mirrors the SDK's
 * `WidgetFamily`, so a variants object written against the SDK is accepted.
 *
 * @example
 * ```ts
 * const family: VoltraWidgetFamily = "systemSmall";
 * ```
 */
export type VoltraWidgetFamily =
  | "systemSmall"
  | "systemMedium"
  | "systemLarge"
  | "systemExtraLarge"
  | "accessoryCircular"
  | "accessoryRectangular"
  | "accessoryInline";
