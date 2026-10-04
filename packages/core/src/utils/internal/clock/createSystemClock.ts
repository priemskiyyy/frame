import type { FrameClock } from "src/types/FrameClock";

export const createSystemClock = (): FrameClock =>
  Object.freeze({
    now: () => Date.now(),
    setTimer: (callback: () => void, delay: number) => {
      const timer = setTimeout(callback, delay);

      return () => clearTimeout(timer);
    },
  });
