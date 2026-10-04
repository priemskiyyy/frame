import { expect, test } from "vitest";
import { formatIssuePath } from "src/utils/internal/validation/formatIssuePath";

test("an issue without a path is the whole value", () => {
  expect(formatIssuePath(undefined)).toBe("");
});

test("keys and indexes are written as a path, and a key object by its key", () => {
  expect(formatIssuePath(["items", 2, { key: "label" }])).toBe(
    "items[2].label",
  );
});

test("a symbol key is written readably", () => {
  expect(formatIssuePath([Symbol("x")])).toBe("Symbol(x)");
});
