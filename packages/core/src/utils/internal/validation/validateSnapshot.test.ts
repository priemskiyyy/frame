import { expect, test } from "vitest";
import { z } from "zod";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchemaResult } from "src/types/StandardSchemaResult";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { widget } from "src/utils/widget";
import { createScriptedWidget } from "src/utils/scriptedWidget.fixture";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { validateSnapshot } from "src/utils/internal/validation/validateSnapshot";

const definition = widget({
  name: "ItemsWidget",
  schema: z.object({ items: z.array(z.object({ label: z.string() })) }),
  fallback: { items: [] },
});

const validate = (value: { items: { label: string | number }[] }) => {
  const captured = captureSnapshot(value, DEFAULT_LIMITS);

  if (captured.status === "rejected") {
    throw new Error("The value is not transportable.");
  }

  return validateSnapshot(definition, captured.canonical, DEFAULT_LIMITS);
};

const validateScripted = (
  answer: (value: JsonRecord) => StandardSchemaResult<JsonRecord>,
) => {
  const captured = captureSnapshot({ n: 1 }, DEFAULT_LIMITS);

  if (captured.status === "rejected") {
    throw new Error("The value is not transportable.");
  }

  return validateSnapshot(
    createScriptedWidget(answer),
    captured.canonical,
    DEFAULT_LIMITS,
  );
};

test("the schema sees an owned frozen copy and the valid answer is that copy", async () => {
  const value = { items: [{ label: "a" }] };
  const answer = await validate(value);

  expect(answer.status).toBe("valid");
  expect(answer.status === "valid" && answer.snapshot).toEqual(value);
  expect(answer.status === "valid" && answer.snapshot).not.toBe(value);
  expect(
    answer.status === "valid" && Object.isFrozen(answer.snapshot.items),
  ).toBe(true);
});

test("an issue's path is written as the schema's path", async () => {
  const answer = await validate({ items: [{ label: "a" }, { label: 3 }] });

  expect(answer).toMatchObject({
    status: "rejected",
    reason: "schema-rejected",
    issues: [{ path: "items[1].label" }],
  });
});

test("an issue with no path is at the root, and its message is the schema's", () => {
  expect(validateScripted(() => ({ issues: [{ message: "no" }] }))).toEqual({
    status: "rejected",
    reason: "schema-rejected",
    issues: [{ path: "", message: "no" }],
  });
});

test("a schema may answer its issues as any iterable, and each keeps its own path", () => {
  const answer = validateScripted(() => ({
    issues: new Set([
      { message: "first", path: ["a", 0] },
      { message: "second" },
    ]),
  }));

  expect(answer).toEqual({
    status: "rejected",
    reason: "schema-rejected",
    issues: [
      { path: "a[0]", message: "first" },
      { path: "", message: "second" },
    ],
  });
});

test("a schema answer that cannot be written as plain data changed the value, at the root", () => {
  const answer = validateScripted((value) => ({
    // @ts-expect-error a Date is not a JSON value
    value: { ...value, at: new Date(0) },
  }));

  expect(answer).toMatchObject({
    status: "rejected",
    reason: "changed-value",
    issues: [
      { path: "", message: expect.stringMatching(/changed this value/) },
    ],
  });
});

test("a schema answer that differs from the value names each path that changed", () => {
  expect(
    validateScripted(() => ({ value: { n: 2, added: true } })),
  ).toMatchObject({
    status: "rejected",
    reason: "changed-value",
    issues: [{ path: "n" }, { path: "added" }],
  });
});

test("a schema that throws or rejects answers schema-threw", async () => {
  const thrown = validateScripted(() => {
    throw new Error("boom");
  });

  expect(thrown).toMatchObject({ status: "rejected", reason: "schema-threw" });

  const captured = captureSnapshot({ n: 1 }, DEFAULT_LIMITS);

  if (captured.status === "rejected") {
    throw new Error("The value is not transportable.");
  }

  const rejecting = widget({
    name: "RejectingWidget",
    schema: {
      "~standard": {
        version: 1,
        vendor: "rejecting",
        validate: (value) => {
          if (value.n === 1) {
            return Promise.reject(new Error("late"));
          }

          return { value };
        },
      },
    },
    fallback: {},
  });

  expect(
    await validateSnapshot(rejecting, captured.canonical, DEFAULT_LIMITS),
  ).toMatchObject({ status: "rejected", reason: "schema-threw" });
});

test("a synchronous schema answers synchronously", () => {
  expect("then" in validate({ items: [] })).toBe(false);
});
