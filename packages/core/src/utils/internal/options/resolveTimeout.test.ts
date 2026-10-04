import { expect, test } from "vitest";
import { DEFAULT_TIMEOUT, MAX_TIMEOUT } from "src/utils/constants/defaults";
import { resolveTimeout } from "src/utils/internal/options/resolveTimeout";

test("a Frame that sets no timeout waits five seconds, and at most 2147483647 ms is allowed", () => {
  expect(resolveTimeout(undefined)).toBe(5_000);
  expect(DEFAULT_TIMEOUT).toBe(5_000);
  expect(MAX_TIMEOUT).toBe(2_147_483_647);
});

test("a timeout that can work is used as given", () => {
  expect(resolveTimeout(1)).toBe(1);
  expect(resolveTimeout(0.5)).toBe(0.5);
  expect(resolveTimeout(MAX_TIMEOUT)).toBe(MAX_TIMEOUT);
});

test("a timeout that is not positive, finite or within a host timer is refused, and the message says what it was", () => {
  for (const value of [
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    MAX_TIMEOUT + 1,
  ]) {
    expect(() => resolveTimeout(value)).toThrowError(
      expect.objectContaining({
        name: "FrameError",
        code: "INVALID_CONFIGURATION",
        message: `timeout is a positive number of milliseconds no larger than 2147483647, not ${value}.`,
      }),
    );
  }
});
