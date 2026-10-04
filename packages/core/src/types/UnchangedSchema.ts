import type { StandardSchema } from "src/types/StandardSchema";

type ChangesTheValue = {
  "A schema whose input differs from its output changes the value it validates. Shape the value in your projection, then publish it.": never;
};

/**
 * What a schema must satisfy to describe display data: its input and output
 * are one type, so it accepts exactly what it returns. A transform, a
 * coercion or a default makes them differ, and this resolves to a type no
 * schema has, so the mistake is a compile error at the definition.
 *
 * @example
 * ```ts
 * type Checked = UnchangedSchema<{ days: number }, { days: number }>;
 * ```
 */
export type UnchangedSchema<TInput, TOutput> = [TInput] extends [TOutput]
  ? [TOutput] extends [TInput]
    ? StandardSchema<TInput, TOutput>
    : ChangesTheValue
  : ChangesTheValue;
