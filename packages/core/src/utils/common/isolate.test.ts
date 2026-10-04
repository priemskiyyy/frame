import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import { captureRethrown } from "src/utils/common/captureRethrown.fixture";
import { isolate } from "src/utils/common/isolate";

test("a listener that throws is rethrown in a microtask, never into the caller", () => {
  const rethrown = captureRethrown();

  expect(() =>
    isolate(() => {
      throw new Error("listener failed");
    }),
  ).not.toThrow();
  expect(rethrown()).toEqual([new Error("listener failed")]);
});

test("an asynchronous listener that rejects is rethrown in a microtask too", async () => {
  const rethrown = captureRethrown();

  isolate(async () => {
    throw new Error("async listener failed");
  });
  await settle();

  expect(rethrown()).toEqual([new Error("async listener failed")]);
});

test("a listener that succeeds rethrows nothing", async () => {
  const rethrown = captureRethrown();

  isolate(() => {});
  isolate(async () => {});
  await settle();

  expect(rethrown()).toEqual([]);
});
