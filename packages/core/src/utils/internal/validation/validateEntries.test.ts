import { expect, test } from "vitest";
import { z } from "zod";
import type { EntryText } from "src/types/internal/EntryText";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { widget } from "src/utils/widget";
import { validateEntries } from "src/utils/internal/validation/validateEntries";

const counter = widget({
  name: "CounterWidget",
  schema: z.object({ count: z.number() }),
  fallback: { count: 0 },
});

const text = (at: number, count: number | string): EntryText => ({
  at,
  canonical: JSON.stringify({ count }),
});

const validate = (texts: EntryText[], now: number) =>
  validateEntries(counter, texts, { limits: DEFAULT_LIMITS, now });

test("the current entry is the latest one that is not in the future", () => {
  const answer = validate([text(1, 1), text(5, 2), text(9, 3)], 6);

  expect(answer).toMatchObject({
    status: "valid",
    snapshot: {
      current: { snapshot: { count: 2 }, canonical: '{"count":2}' },
    },
  });
});

test("an entry due exactly now is current", () => {
  expect(validate([text(1, 1), text(5, 2)], 5)).toMatchObject({
    snapshot: { current: { snapshot: { count: 2 } } },
  });
});

test("every entry, and the list of them, is frozen, whatever is current", () => {
  const answer = validate([text(1, 1), text(5, 2)], 1);

  if (!("snapshot" in answer)) {
    throw new Error("The timeline was expected to be valid.");
  }

  const { entries } = answer.snapshot;

  expect(entries).toEqual([
    { at: 1, data: { count: 1 } },
    { at: 5, data: { count: 2 } },
  ]);
  expect(Object.isFrozen(entries)).toBe(true);
  expect(entries.map((entry) => Object.isFrozen(entry))).toEqual([true, true]);
  expect(Object.isFrozen(entries[0]?.data)).toBe(true);
});

test("a rejected entry is named by its place in the timeline", () => {
  expect(validate([text(1, 1), text(2, "two"), text(3, 3)], 3)).toMatchObject({
    status: "rejected",
    reason: "schema-rejected",
    issues: [{ path: "entries[1].data.count" }],
  });
});

test("every schema answer being synchronous makes the answer synchronous", () => {
  expect("then" in validate([text(1, 1)], 1)).toBe(false);
});

test("an asynchronous schema answers the same timeline later", async () => {
  const slow = widget({
    name: "SlowWidget",
    schema: {
      "~standard": {
        version: 1,
        vendor: "slow",
        validate: (value) => {
          if (Object.keys(value).length === 0) {
            return { value };
          }

          return Promise.resolve({ value });
        },
      },
    },
    fallback: {},
  });

  const answer = validateEntries(
    slow,
    [
      { at: 1, canonical: '{"n":1}' },
      { at: 2, canonical: '{"n":2}' },
    ],
    { limits: DEFAULT_LIMITS, now: 2 },
  );

  expect("then" in answer).toBe(true);
  expect(await answer).toMatchObject({
    status: "valid",
    snapshot: { current: { snapshot: { n: 2 } } },
  });
});
