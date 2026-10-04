import type { WidgetOptions } from "src/types/WidgetOptions";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { WIDGET_NAME_PATTERN } from "src/utils/constants/widgetName";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { validateSnapshot } from "src/utils/internal/validation/validateSnapshot";
import { FrameError } from "src/utils/FrameError";

/**
 * Declares a widget once: its native-safe name, the schema of its final
 * display data, and the fallback shown before real data arrives. A schema
 * whose input and output types differ does not type check, and a fallback the
 * schema refuses, or answers with a promise, throws `INVALID_CONFIGURATION` at
 * the definition.
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
export function widget<
  TName extends string,
  TInput extends JsonRecord,
  TOutput extends JsonRecord,
>(
  options: WidgetOptions<TName, TInput, TOutput>,
): WidgetDefinition<TName, TOutput>;

export function widget<TName extends string, TData extends JsonRecord>({
  name,
  schema,
  fallback,
}: {
  name: TName;
  schema: StandardSchema<TData, TData>;
  fallback: TData;
}): WidgetDefinition<TName, TData> {
  if (!WIDGET_NAME_PATTERN.test(name)) {
    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `A widget name is letters and digits and starts with a letter, and "${name}" is not.`,
    });
  }

  const captured = captureSnapshot(fallback, DEFAULT_LIMITS);

  if (captured.status === "rejected") {
    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `The fallback of ${name} cannot be published: ${captured.issues[0]?.message}`,
    });
  }

  const definition = { name, schema, fallback };

  const validation = validateSnapshot(
    definition,
    captured.canonical,
    DEFAULT_LIMITS,
  );

  if ("then" in validation) {
    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `The schema of ${name} answered the fallback with a promise: a fallback must validate synchronously, so it is safe on the first render.`,
    });
  }

  if (validation.status === "rejected") {
    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `The fallback of ${name} is not valid under its schema: ${validation.issues[0]?.message}`,
    });
  }

  return Object.freeze({ name, schema, fallback: validation.snapshot });
}
