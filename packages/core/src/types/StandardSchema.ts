import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchemaResult } from "src/types/StandardSchemaResult";

/**
 * The part of the Standard Schema v1 contract Frame reads, which zod, valibot
 * and arktype implement. Input and output are one type on purpose, because
 * Frame publishes what the schema accepts, unchanged.
 *
 * @example
 * ```ts
 * const schema = z.object({ days: z.number().int().nonnegative() });
 * ```
 */
export type StandardSchema<TInput, TOutput> = {
  "~standard": {
    version: 1;
    vendor: string;
    types?: { input: TInput; output: TOutput } | undefined;
    validate: (
      value: JsonRecord,
    ) => StandardSchemaResult<TOutput> | Promise<StandardSchemaResult<TOutput>>;
  };
};
