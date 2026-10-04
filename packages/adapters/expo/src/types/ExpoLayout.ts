import type { JsonRecord } from "@priemskiyyy/frame/adapter";
import type { JSX } from "react";

import type { ExpoWidgetEnvironmentLike } from "src/types/ExpoWidgetEnvironmentLike";

/**
 * A render function for the Expo widget runtime: it receives the published
 * data and the host's environment, and returns Expo UI. Mark its body with the
 * `'widget'` directive, because the build turns it into the source the native
 * extension evaluates, so it can use nothing outside its own body.
 *
 * @example
 * ```tsx
 * const StreakView: ExpoLayout<StreakProps> = (props) => {
 *   "widget";
 *
 *   return <Text>{`${props.days} days`}</Text>;
 * };
 * ```
 */
export type ExpoLayout<TData extends JsonRecord> = (
  props: TData,
  environment: ExpoWidgetEnvironmentLike,
) => JSX.Element;
