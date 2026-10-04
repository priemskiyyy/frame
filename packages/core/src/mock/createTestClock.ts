import type { TestClock } from "src/mock/types/TestClock";
import type { TestClockOptions } from "src/mock/types/TestClockOptions";
import { FrameError } from "src/utils/FrameError";

type Timer = { at: number; order: number; callback: () => void };

/**
 * A manual `FrameClock` for tests: time stands still until `advance`.
 *
 * @example
 * ```ts
 * const clock = createTestClock();
 * const frame = new Frame({ widgets, clock });
 * ```
 */
export const createTestClock = ({
  now = 0,
}: TestClockOptions = {}): TestClock => {
  const timers = new Set<Timer>();
  let elapsed = 0;
  let order = 0;

  const getNextDue = (until: number) => {
    let next: Timer | null = null;

    for (const timer of timers) {
      if (timer.at > until) {
        continue;
      }

      const isEarlier =
        next === null ||
        timer.at < next.at ||
        (timer.at === next.at && timer.order < next.order);

      if (!isEarlier) {
        continue;
      }

      next = timer;
    }

    return next;
  };

  return Object.freeze({
    now: () => now + elapsed,
    setTimer: (callback: () => void, delay: number) => {
      order += 1;

      const timer = { at: elapsed + Math.max(0, delay), order, callback };

      timers.add(timer);

      return () => {
        timers.delete(timer);
      };
    },
    advance: (milliseconds: number) => {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        throw new FrameError({
          code: "INVALID_CONFIGURATION",
          message: `advance takes finite milliseconds, not ${milliseconds}.`,
        });
      }

      const until = elapsed + milliseconds;

      for (
        let timer = getNextDue(until);
        timer !== null;
        timer = getNextDue(until)
      ) {
        timers.delete(timer);
        elapsed = timer.at;
        timer.callback();
      }

      elapsed = Math.max(elapsed, until);
    },
    pending: () => timers.size,
  });
};
