/**
 * Resource guardrails Frame applies before anything reaches a provider. They
 * are Frame's own policy, not Apple's or Android's limits.
 *
 * @example
 * ```ts
 * const frame = new Frame({ widgets, limits: { bytes: 16_384 } });
 * ```
 */
export type FrameLimits = {
  /** Deepest nesting of records and arrays. Defaults to 64. */
  depth: number;
  /** Most values below the top-level record in one publication, counting every record, array and scalar. Defaults to 50000. */
  nodes: number;
  /** Largest canonical UTF-8 size of one publication. Defaults to 262144. */
  bytes: number;
  /** Most entries in one timeline. Defaults to 64. */
  entries: number;
};
