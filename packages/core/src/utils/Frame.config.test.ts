import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { widget } from "src/utils/widget";
import { Frame } from "src/utils/Frame";
import { streak } from "src/utils/Frame.fixture";

const expectMisconfiguration = (create: () => Frame, pattern: RegExp) =>
  expect(create).toThrowError(
    expect.objectContaining({
      name: "FrameError",
      code: "INVALID_CONFIGURATION",
      message: expect.stringMatching(pattern),
    }),
  );

test("constructing a Frame calls no provider", () => {
  const { adapter, control } = createMockAdapter(streak);

  new Frame({ widgets: { streak }, adapters: [adapter] });

  expect(control.sessions()).toBe(0);
  expect(control.calls()).toEqual([]);
});

test("two widgets cannot share one native name", () => {
  expectMisconfiguration(
    () => new Frame({ widgets: { one: streak, two: streak } }),
    /Two widgets are named StreakWidget/,
  );
});

test("an adapter for a widget the Frame does not list is refused", () => {
  const other = widget({
    name: "OtherWidget",
    schema: streak.schema,
    fallback: { state: "empty" },
  });

  const { adapter } = createMockAdapter(other);

  expectMisconfiguration(
    // @ts-expect-error the types refuse it; this proves the check for callers the types do not reach
    () => new Frame({ widgets: { streak }, adapters: [adapter] }),
    /mock adapter is for OtherWidget, which this Frame does not list/,
  );
});

test("a timeout must be a positive number of milliseconds", () => {
  const { adapter } = createMockAdapter(streak);

  expectMisconfiguration(
    () => new Frame({ widgets: { streak }, adapters: [adapter], timeout: 0 }),
    /timeout/,
  );
  expectMisconfiguration(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        timeout: Number.NaN,
      }),
    /timeout/,
  );
});

test("a timeout a host timer cannot hold is refused", () => {
  const { adapter } = createMockAdapter(streak);

  expectMisconfiguration(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        timeout: 2_147_483_648,
      }),
    /timeout.*2147483647/,
  );
  expect(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        timeout: 2_147_483_647,
      }),
  ).not.toThrow();
});

test("a limit set to undefined is the default, as an absent one is", () => {
  const { adapter } = createMockAdapter(streak);

  expect(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        limits: { depth: undefined, bytes: undefined },
      }),
  ).not.toThrow();
});

test("limits must be positive integers", () => {
  const { adapter } = createMockAdapter(streak);

  expectMisconfiguration(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        limits: { depth: 0 },
      }),
    /limits\.depth/,
  );
  expectMisconfiguration(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        limits: { bytes: 1.5 },
      }),
    /limits\.bytes/,
  );
});

test("a fallback larger than the Frame's limits is refused when the Frame is made", () => {
  const { adapter } = createMockAdapter(streak);

  expectMisconfiguration(
    () =>
      new Frame({
        widgets: { streak },
        adapters: [adapter],
        limits: { bytes: 4 },
      }),
    /fallback of "streak" breaks the limits/,
  );
});

test("a Frame with no widgets is allowed, and hands out nothing", async () => {
  const frame = new Frame({ widgets: {} });

  expect(await frame.prepare()).toEqual({ widgets: {} });
  expect(await frame.context({ reset: "fallback" })).toEqual({ widgets: {} });
});

test("the byte limit applies to a publication", async () => {
  const wide = widget({
    name: "WideWidget",
    schema: streak.schema,
    fallback: { state: "empty" },
  });

  const { adapter } = createMockAdapter(wide);

  const frame = new Frame({
    widgets: { wide },
    adapters: [adapter],
    limits: { bytes: 40 },
  });

  const outcome = await frame.widget("wide").publish({
    state: "ready",
    days: 1,
    label: "x".repeat(100),
  });

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "limit-exceeded",
  });
});
