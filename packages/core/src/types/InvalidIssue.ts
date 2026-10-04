/**
 * One problem with a publication: where it is, and what is wrong. Frame adds
 * no value to a message, but a schema's own message may quote one.
 *
 * @example
 * ```ts
 * const issue: InvalidIssue = { path: "items[2].label", message: "Expected a string." };
 * ```
 */
export type InvalidIssue = {
  /** A path such as `days` or `items[2].label`; empty for the whole value. */
  path: string;
  /** Frame's own sentence, or the schema's message for a `schema-rejected` issue. */
  message: string;
};
