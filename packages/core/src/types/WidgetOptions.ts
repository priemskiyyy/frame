import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import type { UnchangedSchema } from "src/types/UnchangedSchema";

/**
 * Options of `widget`. The fallback is checked against the schema's own
 * output type, so a wrong fallback is a compile error before it is a runtime one.
 *
 * @example
 * ```ts
 * const options: WidgetOptions<"StreakWidget", { days: number }, { days: number }> = {
 *   name: "StreakWidget",
 *   schema: StreakSchema,
 *   fallback: { days: 0 },
 * };
 * ```
 */
export type WidgetOptions<
  TName extends string,
  TInput extends JsonRecord,
  TOutput extends JsonRecord,
> = {
  /** Letters and digits, starting with a letter: it becomes a native type name. */
  name: TName;
  schema: StandardSchema<TInput, TOutput> & UnchangedSchema<TInput, TOutput>;
  fallback: NoInfer<TOutput>;
};
