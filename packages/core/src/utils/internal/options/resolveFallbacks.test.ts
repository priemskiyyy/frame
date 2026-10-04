import { expect, test } from "vitest";
import { z } from "zod";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { widget } from "src/utils/widget";
import { resolveFallbacks } from "src/utils/internal/options/resolveFallbacks";

const counter = widget({
  name: "CounterWidget",
  schema: z.object({ count: z.number() }),
  fallback: { count: 0 },
});

const expectMisconfiguration = (
  create: () => ReturnType<typeof resolveFallbacks>,
  message: RegExp,
) => {
  expect(create).toThrowError(
    expect.objectContaining({
      name: "FrameError",
      code: "INVALID_CONFIGURATION",
      message: expect.stringMatching(message),
    }),
  );
};

test("every fallback is read once into its frozen snapshot and canonical text", () => {
  const [resolved] = resolveFallbacks({ counter }, DEFAULT_LIMITS);

  expect(resolved).toMatchObject({
    key: "counter",
    definition: counter,
    fallback: { snapshot: { count: 0 }, canonical: '{"count":0}' },
  });
  expect(Object.isFrozen(resolved?.fallback.snapshot)).toBe(true);
});

test("a fallback over the limits is refused with what broke them", () => {
  expectMisconfiguration(
    () => resolveFallbacks({ counter }, { ...DEFAULT_LIMITS, bytes: 4 }),
    /fallback of "counter" breaks the limits of this Frame: The value is larger than 4 bytes\./,
  );
});

test("two widgets with one name are refused, whatever their keys", () => {
  expectMisconfiguration(
    () => resolveFallbacks({ one: counter, two: counter }, DEFAULT_LIMITS),
    /Two widgets are named CounterWidget/,
  );
});

test("a definition that widget() did not make is checked for its name and its fallback", () => {
  const unnamed: WidgetDefinition = { ...counter, name: "not a name" };
  const wrong: WidgetDefinition = { ...counter, fallback: { count: "none" } };

  expectMisconfiguration(
    () => resolveFallbacks({ unnamed }, DEFAULT_LIMITS),
    /widget name is letters and digits.*"not a name"/,
  );
  expectMisconfiguration(
    () => resolveFallbacks({ wrong }, DEFAULT_LIMITS),
    /fallback of "wrong" is not valid under its schema/,
  );
});
