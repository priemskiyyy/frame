/**
 * Why Frame refused a request before any provider call.
 *
 * - `not-transportable`: the value is not plain JSON data, for example a
 *   `Date`, a function, a cycle, a sparse array or a getter.
 * - `limit-exceeded`: the value is deeper, larger or longer than the limits.
 * - `schema-rejected`: the definition's schema reported issues.
 * - `schema-threw`: the definition's schema threw, rejected, or did not answer
 *   within the Frame's `timeout`.
 * - `changed-value`: the schema accepted the value but returned a different
 *   one, for example by stripping a key or filling a default.
 * - `invalid-timeline`: the entries are empty, unsorted, duplicated, or the
 *   first one is in the future.
 *
 * @example
 * ```ts
 * const reason: InvalidReason = "changed-value";
 * ```
 */
export type InvalidReason =
  | "not-transportable"
  | "limit-exceeded"
  | "schema-rejected"
  | "schema-threw"
  | "changed-value"
  | "invalid-timeline";
