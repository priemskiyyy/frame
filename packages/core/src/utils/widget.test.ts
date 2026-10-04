import { expect, test } from "vitest";
import { z } from "zod";
import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import { widget } from "src/utils/widget";
import { StreakSchema } from "src/utils/Frame.fixture";

const expectMisconfiguration = (
  create: () => WidgetDefinition,
  pattern: RegExp,
) => {
  expect(create).toThrowError(
    expect.objectContaining({
      name: "FrameError",
      code: "INVALID_CONFIGURATION",
      message: expect.stringMatching(pattern),
    }),
  );
};

test("a definition keeps its name, schema and a frozen fallback", () => {
  const fallback: { state: "empty" } = { state: "empty" };

  const definition = widget({
    name: "StreakWidget",
    schema: StreakSchema,
    fallback,
  });

  expect(definition.name).toBe("StreakWidget");
  expect(definition.schema).toBe(StreakSchema);
  expect(definition.fallback).toEqual({ state: "empty" });
  expect(Object.isFrozen(definition)).toBe(true);
  expect(Object.isFrozen(definition.fallback)).toBe(true);
});

test("changing the object a fallback was made from does not change the fallback", () => {
  const source = { items: ["a"] };

  const definition = widget({
    name: "AgendaWidget",
    schema: z.object({ items: z.array(z.string()) }),
    fallback: source,
  });

  source.items.push("b");

  expect(definition.fallback).toEqual({ items: ["a"] });
});

test("a name is letters and digits and starts with a letter", () => {
  const create = (name: string) => () =>
    widget({ name, schema: StreakSchema, fallback: { state: "empty" } });

  expect(create("StreakWidget2")).not.toThrow();
  expectMisconfiguration(create(""), /widget name/);
  expectMisconfiguration(create("2Streak"), /widget name/);
  expectMisconfiguration(create("Streak Widget"), /widget name/);
  expectMisconfiguration(create("Streak_Widget"), /widget name/);
  expectMisconfiguration(create("Streak-Widget"), /widget name/);
});

test("a fallback the schema refuses throws at the definition", () => {
  expectMisconfiguration(
    () =>
      widget({
        name: "BadFallbackWidget",
        schema: z.object({ days: z.number().int().nonnegative() }),
        fallback: { days: -1 },
      }),
    /fallback of BadFallbackWidget is not valid under its schema/,
  );
});

test("a fallback that is not plain data throws at the definition", () => {
  const fallback: { at: Date } = { at: new Date(0) };

  expectMisconfiguration(
    () =>
      widget({
        name: "DateFallbackWidget",
        // @ts-expect-error a Date is not display data
        schema: z.object({ at: z.date() }),
        // @ts-expect-error a Date is not display data
        fallback,
      }),
    /cannot be published/,
  );
});

test("a schema that answers the fallback with a promise cannot guarantee a safe first render", () => {
  expectMisconfiguration(
    () =>
      widget({
        name: "AsyncFallbackWidget",
        schema: {
          "~standard": {
            version: 1,
            vendor: "async",
            validate: (value) => Promise.resolve({ value }),
          },
        },
        fallback: {} satisfies JsonRecord,
      }),
    /promise/,
  );
});

test("a schema that changes the fallback throws at the definition", () => {
  const fallback: { days: number; extra: boolean } = { days: 1, extra: true };

  expectMisconfiguration(
    () =>
      widget({
        name: "StrippingWidget",
        schema: z.object({ days: z.number() }),
        fallback,
      }),
    /not valid under its schema/,
  );
});

test("a fallback whose keys are not in sorted order is a valid fallback", () => {
  const definition = widget({
    name: "UnsortedWidget",
    schema: z.object({ b: z.number(), a: z.number() }),
    fallback: { b: 1, a: 2 },
  });

  expect(definition.fallback).toEqual({ a: 2, b: 1 });
});

test("a fallback larger than the default byte limit cannot be published", () => {
  expectMisconfiguration(
    () =>
      widget({
        name: "HugeFallbackWidget",
        schema: z.object({ text: z.string() }),
        fallback: { text: "x".repeat(262_144) },
      }),
    /fallback of HugeFallbackWidget cannot be published: The value is larger than 262144 bytes\./,
  );
});
