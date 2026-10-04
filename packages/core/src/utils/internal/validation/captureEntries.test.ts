import { expect, test } from "vitest";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { captureEntries } from "src/utils/internal/validation/captureEntries";

const entry = (at: number, data = {}) => ({ at, data });

test("every entry is written as its instant and canonical text", () => {
  expect(
    captureEntries(
      [entry(1, { b: 1, a: 2 }), entry(2, { text: "é" })],
      DEFAULT_LIMITS,
    ),
  ).toEqual({
    status: "captured",
    texts: [
      { at: 1, canonical: '{"a":2,"b":1}' },
      { at: 2, canonical: '{"text":"é"}' },
    ],
  });
});

test("a timeline of exactly the byte limit is captured, and one byte more is refused", () => {
  const entries = [entry(1), entry(2)];

  expect(captureEntries(entries, { ...DEFAULT_LIMITS, bytes: 4 }).status).toBe(
    "captured",
  );
  expect(captureEntries(entries, { ...DEFAULT_LIMITS, bytes: 3 })).toEqual({
    status: "rejected",
    reason: "limit-exceeded",
    issues: [
      { path: "entries", message: "The timeline is larger than 3 bytes." },
    ],
  });
});

test("the entries are counted together, however small each one is", () => {
  const entries = Array.from({ length: 10 }, (_, index) => entry(index));

  expect(
    captureEntries(entries, { ...DEFAULT_LIMITS, bytes: 19 }),
  ).toMatchObject({ status: "rejected", reason: "limit-exceeded" });
  expect(captureEntries(entries, { ...DEFAULT_LIMITS, bytes: 20 }).status).toBe(
    "captured",
  );
});

test("an entry that cannot travel is named by its place in the timeline", () => {
  expect(
    captureEntries(
      [entry(1), entry(2, { nested: { days: Number.NaN } })],
      DEFAULT_LIMITS,
    ),
  ).toMatchObject({
    status: "rejected",
    reason: "not-transportable",
    issues: [{ path: "entries[1].data.nested.days" }],
  });
});
