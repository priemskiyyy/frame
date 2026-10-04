/**
 * One reason a Standard Schema refused a value.
 *
 * @example
 * ```ts
 * const issue: StandardIssue = { message: "Expected number", path: ["days"] };
 * ```
 */
export type StandardIssue = {
  message: string;
  path?: Iterable<PropertyKey | { key: PropertyKey }> | undefined;
};
