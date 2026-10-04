import { afterEach, expect, test, vi } from "vitest";
import { createSystemClock } from "src/utils/internal/clock/createSystemClock";

afterEach(() => {
  vi.useRealTimers();
});

test("the system clock reads the host's current time in epoch milliseconds", () => {
  vi.useFakeTimers();
  vi.setSystemTime(123_456);

  const clock = createSystemClock();

  expect(clock.now()).toBe(123_456);

  vi.advanceTimersByTime(44);

  expect(clock.now()).toBe(123_500);
});

test("a timer fires once, after exactly its delay", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);

  const fired: number[] = [];
  const clock = createSystemClock();

  clock.setTimer(() => fired.push(clock.now()), 100);
  vi.advanceTimersByTime(99);

  expect(fired).toEqual([]);

  vi.advanceTimersByTime(1);

  expect(fired).toEqual([100]);

  vi.advanceTimersByTime(1_000);

  expect(fired).toEqual([100]);
});

test("a cancelled timer never fires, and the host holds no timer for it", () => {
  vi.useFakeTimers();

  let fired = 0;

  const cancel = createSystemClock().setTimer(() => {
    fired += 1;
  }, 100);

  expect(vi.getTimerCount()).toBe(1);

  cancel();

  expect(vi.getTimerCount()).toBe(0);

  vi.advanceTimersByTime(1_000);

  expect(fired).toBe(0);
});

test("the system clock is frozen", () => {
  expect(Object.isFrozen(createSystemClock())).toBe(true);
});
