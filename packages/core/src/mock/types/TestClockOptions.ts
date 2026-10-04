/**
 * Where a test clock starts.
 *
 * @example
 * ```ts
 * const clock = createTestClock({ now: 1_760_000_000_000 });
 * ```
 */
export type TestClockOptions = {
  /** Epoch milliseconds at the start, 0 by default. */
  now?: number | undefined;
};
