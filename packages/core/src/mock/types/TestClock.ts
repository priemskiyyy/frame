import type { FrameClock } from "src/types/FrameClock";

/**
 * A clock that moves only when a test says so. `advance` runs every timer
 * that falls due, in order, including timers those timers set.
 *
 * @example
 * ```ts
 * const clock = createTestClock();
 * const frame = new Frame({ widgets, clock });
 *
 * clock.advance(5_000);
 * ```
 */
export type TestClock = FrameClock & {
  advance: (milliseconds: number) => void;
  /** Timers set and not yet fired or cancelled. */
  pending: () => number;
};
