import { expect, test } from "vitest";
import { createTestClock } from "src/mock/createTestClock";

test("time stands still until advanced", () => {
  const clock = createTestClock({ now: 100 });

  expect(clock.now()).toBe(100);

  clock.advance(50);

  expect(clock.now()).toBe(150);
});

test("timers fire in order, including timers they set, and only when due", () => {
  const clock = createTestClock();
  const fired: string[] = [];

  clock.setTimer(() => fired.push("late"), 30);
  clock.setTimer(() => {
    fired.push("first");
    clock.setTimer(() => fired.push("nested"), 5);
  }, 10);
  clock.setTimer(() => fired.push("same-time-second"), 10);

  clock.advance(9);

  expect(fired).toEqual([]);

  clock.advance(21);

  expect(fired).toEqual(["first", "same-time-second", "nested", "late"]);
});

test("a cancelled timer never fires and is not pending", () => {
  const clock = createTestClock();
  let fired = false;

  const cancel = clock.setTimer(() => {
    fired = true;
  }, 10);

  expect(clock.pending()).toBe(1);

  cancel();
  clock.advance(100);

  expect(fired).toBe(false);
  expect(clock.pending()).toBe(0);
});

test("advancing by something that is not finite milliseconds throws", () => {
  const clock = createTestClock();

  expect(() => clock.advance(-1)).toThrowError(
    expect.objectContaining({ code: "INVALID_CONFIGURATION" }),
  );
  expect(() => clock.advance(Number.NaN)).toThrowError(
    expect.objectContaining({ code: "INVALID_CONFIGURATION" }),
  );
});

test("a test clock starts at zero unless told otherwise", () => {
  expect(createTestClock().now()).toBe(0);
  expect(createTestClock({ now: undefined }).now()).toBe(0);
});

test("a timer set for the past fires at the present, and time does not run backwards", () => {
  const clock = createTestClock({ now: 100 });
  const seen: number[] = [];

  clock.setTimer(() => seen.push(clock.now()), -5);
  clock.advance(0);

  expect(seen).toEqual([100]);
  expect(clock.now()).toBe(100);
});

test("a timer due exactly at the end of an advance fires, and one a millisecond later waits", () => {
  const clock = createTestClock();
  const fired: string[] = [];

  clock.setTimer(() => fired.push("on time"), 10);
  clock.setTimer(() => fired.push("later"), 11);
  clock.advance(10);

  expect(fired).toEqual(["on time"]);
  expect(clock.pending()).toBe(1);
});

test("inside a timer's callback the time is the timer's instant, and afterwards the end of the advance", () => {
  const clock = createTestClock({ now: 100 });
  const seen: number[] = [];

  clock.setTimer(() => seen.push(clock.now()), 30);
  clock.setTimer(() => seen.push(clock.now()), 10);
  clock.advance(100);

  expect(seen).toEqual([110, 130]);
  expect(clock.now()).toBe(200);
});
