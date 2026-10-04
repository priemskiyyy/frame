import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";

/**
 * What a widget shows, independent of any provider: its native-safe name, the
 * schema of its final display data, and the empty state shown before real data
 * arrives. Made by `widget`.
 *
 * @example
 * ```ts
 * const streak = widget({
 *   name: "StreakWidget",
 *   schema: z.object({ days: z.number().int().nonnegative() }),
 *   fallback: { days: 0 },
 * });
 * ```
 */
export type WidgetDefinition<
  TName extends string = string,
  TData extends JsonRecord = JsonRecord,
> = {
  /** The widget kind a provider installs. Renaming it renames an installed widget. */
  name: TName;
  schema: StandardSchema<TData, TData>;
  /** Frozen, and valid under `schema`. Published by `reset()` and by a context change that resets. */
  fallback: TData;
};
