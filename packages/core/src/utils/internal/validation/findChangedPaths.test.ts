import { expect, test } from "vitest";
import { findChangedPaths } from "src/utils/internal/validation/findChangedPaths";

test("equal values differ nowhere", () => {
  expect(
    findChangedPaths({ a: [1, { b: null }] }, { a: [1, { b: null }] }),
  ).toEqual([]);
});

test("a key the second value dropped or added is named", () => {
  expect(findChangedPaths({ a: 1, extra: true }, { a: 1 })).toEqual(["extra"]);
  expect(findChangedPaths({ a: 1 }, { a: 1, added: 2 })).toEqual(["added"]);
});

test("a nested change is named by its full path", () => {
  expect(
    findChangedPaths(
      { items: [{ label: "a " }, { label: "b" }] },
      { items: [{ label: "a" }, { label: "b" }] },
    ),
  ).toEqual(["items[0].label"]);
});

test("an array that grew or shrank names the indexes", () => {
  expect(findChangedPaths({ list: [1, 2, 3] }, { list: [1] })).toEqual([
    "list[1]",
    "list[2]",
  ]);
  expect(findChangedPaths({ list: [1] }, { list: [1, 2, 3] })).toEqual([
    "list[1]",
    "list[2]",
  ]);
});

test("a value whose kind changed is named once, at its own path", () => {
  expect(findChangedPaths({ a: { b: 1 } }, { a: [1] })).toEqual(["a"]);
  expect(findChangedPaths({ a: 1 }, { a: null })).toEqual(["a"]);
});

test("a different root is the empty path", () => {
  expect(findChangedPaths([1], { a: 1 })).toEqual([""]);
});

test("only the first ten paths are named", () => {
  const before = Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => [`k${index}`, 1]),
  );

  expect(findChangedPaths(before, {})).toHaveLength(10);
});

test("a key named like a prototype is a key like any other", () => {
  expect(findChangedPaths(JSON.parse('{"__proto__":{}}'), {})).toEqual([
    "__proto__",
  ]);
  expect(findChangedPaths({}, JSON.parse('{"__proto__":{}}'))).toEqual([
    "__proto__",
  ]);
});
