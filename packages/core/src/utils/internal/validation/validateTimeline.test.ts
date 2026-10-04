import { expect, test } from "vitest";
import { MAX_INSTANT } from "src/utils/constants/instant";
import { validateTimeline } from "src/utils/internal/validation/validateTimeline";

const limits = { entries: 3 };
const entry = (at: number) => ({ at, data: {} });

test("a timeline that fits its shape is valid", () => {
  expect(
    validateTimeline([entry(5), entry(10)], { now: 5, limits }),
  ).toBeNull();
});

test("an empty timeline, or one that is not an array, is refused", () => {
  expect(validateTimeline([], { now: 0, limits })?.reason).toBe(
    "invalid-timeline",
  );
  // @ts-expect-error an object is not a list of entries
  expect(validateTimeline({}, { now: 0, limits })?.reason).toBe(
    "invalid-timeline",
  );
});

test("more entries than the limit is limit-exceeded", () => {
  expect(
    validateTimeline([entry(1), entry(2), entry(3), entry(4)], {
      now: 9,
      limits,
    })?.reason,
  ).toBe("limit-exceeded");
});

test("a timeline of exactly the entries limit is valid", () => {
  expect(
    validateTimeline([entry(1), entry(2), entry(3)], { now: 9, limits }),
  ).toBeNull();
});

test("an entry that is not an object is refused with its position", () => {
  // @ts-expect-error null is not an entry
  const rejection = validateTimeline([null], { now: 0, limits });

  expect(rejection?.issues[0]?.path).toBe("entries[0]");
});

test("instants must be safe integers", () => {
  expect(
    validateTimeline([entry(1.5)], { now: 9, limits })?.issues[0]?.path,
  ).toBe("entries[0].at");
  expect(
    validateTimeline([entry(Number.NaN)], { now: 9, limits })?.reason,
  ).toBe("invalid-timeline");
  expect(
    validateTimeline([entry(2 ** 60)], { now: 2 ** 61, limits })?.reason,
  ).toBe("invalid-timeline");
});

test("the earliest and the latest instant a Date holds are valid, and one past either is refused", () => {
  expect(
    validateTimeline([entry(-MAX_INSTANT), entry(MAX_INSTANT)], {
      now: MAX_INSTANT,
      limits,
    }),
  ).toBeNull();
  expect(
    validateTimeline([entry(-MAX_INSTANT - 1)], { now: 0, limits }),
  ).toMatchObject({
    reason: "invalid-timeline",
    issues: [
      {
        path: "entries[0].at",
        message: "An instant is within the range a Date can hold.",
      },
    ],
  });
  expect(
    validateTimeline([entry(0), entry(MAX_INSTANT + 1)], {
      now: MAX_INSTANT,
      limits,
    }),
  ).toMatchObject({
    reason: "invalid-timeline",
    issues: [{ path: "entries[1].at" }],
  });
});

test("instants must be strictly increasing", () => {
  expect(
    validateTimeline([entry(5), entry(5)], { now: 9, limits })?.issues[0]?.path,
  ).toBe("entries[1].at");
  expect(
    validateTimeline([entry(5), entry(4)], { now: 9, limits })?.issues[0]?.path,
  ).toBe("entries[1].at");
});

test("the first entry must not be in the future", () => {
  expect(
    validateTimeline([entry(11)], { now: 10, limits })?.issues[0]?.path,
  ).toBe("entries[0].at");
  expect(validateTimeline([entry(10)], { now: 10, limits })).toBeNull();
});
