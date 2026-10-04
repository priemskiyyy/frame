import type { StandardIssue } from "src/types/StandardIssue";

/**
 * What a Standard Schema answers: the value, or the reasons it refused one.
 *
 * @example
 * ```ts
 * const result: StandardSchemaResult<{ days: number }> = { value: { days: 12 } };
 * ```
 */
export type StandardSchemaResult<TOutput> =
  { value: TOutput; issues?: undefined } | { issues: Iterable<StandardIssue> };
