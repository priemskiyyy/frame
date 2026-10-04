import { expect, test } from "vitest";

import { formatClockTime } from "src/utils/formatClockTime";

// Built from local parts, so the expectation holds in every time zone.
test("a local time reads as hours, minutes, seconds and milliseconds, each padded", () => {
  expect(formatClockTime(new Date(2025, 0, 2, 3, 4, 5, 6).getTime())).toBe(
    "03:04:05.006",
  );
  expect(formatClockTime(new Date(2025, 5, 7, 13, 14, 15, 160).getTime())).toBe(
    "13:14:15.160",
  );
});

test("two instants a millisecond apart read apart", () => {
  const at = new Date(2025, 0, 2, 3, 4, 5, 6).getTime();

  expect(formatClockTime(at)).not.toBe(formatClockTime(at + 1));
});
