/**
 * Where Frame reads time and schedules its deadlines. The default is the
 * system clock; tests pass `createTestClock()` from `@priemskiyyy/frame/mock`.
 *
 * @example
 * ```ts
 * const frame = new Frame({ widgets, clock: createTestClock() });
 * ```
 */
export type FrameClock = {
  /** Epoch milliseconds. */
  now: () => number;
  /** Runs `callback` after `delay` milliseconds and answers a canceller. */
  setTimer: (callback: () => void, delay: number) => () => void;
};
