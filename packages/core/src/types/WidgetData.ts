import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetDefinition } from "src/types/WidgetDefinition";

/**
 * The display data of a definition: what `publish` accepts and `get` returns.
 *
 * @example
 * ```ts
 * type StreakProps = WidgetData<typeof streak>;
 * ```
 */
export type WidgetData<TDefinition extends WidgetDefinition> =
  TDefinition extends WidgetDefinition<string, infer TData extends JsonRecord>
    ? TData
    : never;
