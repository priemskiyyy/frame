import type { JsonRecord } from "@priemskiyyy/frame/adapter";

import type { VoltraWidgetVariants } from "src/types/VoltraWidgetVariants";

/**
 * Builds the Voltra JSX of a widget from its data, one element per family.
 * Frame calls it before it calls the SDK, so a throw here reaches nothing and
 * is answered `failed`.
 *
 * @example
 * ```tsx
 * const render: VoltraLayout<StreakProps> = (props) => ({
 *   systemSmall: <Voltra.Text>{`${props.days} days`}</Voltra.Text>,
 * });
 * ```
 */
export type VoltraLayout<TData extends JsonRecord> = (
  data: TData,
) => VoltraWidgetVariants;
