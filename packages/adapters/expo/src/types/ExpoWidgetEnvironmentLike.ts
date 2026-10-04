/**
 * What the Expo widget runtime tells a render function about the host: the
 * family, the color scheme, the rendering mode and the margins. It mirrors the
 * SDK's `WidgetEnvironment` for a widget without configuration, optional fields
 * as `?: T` too, so a render function written against the SDK's own type is
 * accepted under `exactOptionalPropertyTypes`.
 *
 * @example
 * ```ts
 * const isSmall = (environment: ExpoWidgetEnvironmentLike) => environment.widgetFamily === "systemSmall";
 * ```
 */
export type ExpoWidgetEnvironmentLike = {
  date: Date;
  widgetFamily:
    | "systemSmall"
    | "systemMedium"
    | "systemLarge"
    | "systemExtraLarge"
    | "accessoryCircular"
    | "accessoryRectangular"
    | "accessoryInline";
  colorScheme?: "light" | "dark";
  isLuminanceReduced?: boolean;
  widgetRenderingMode?: "fullColor" | "accented" | "vibrant";
  showsWidgetLabel?: boolean;
  widgetContentMargins?: {
    top: number;
    bottom: number;
    leading: number;
    trailing: number;
  };
  levelOfDetail?: "simplified" | "default";
  /** Always `undefined`: the adapter's widgets take no configuration. */
  configuration: undefined;
};
