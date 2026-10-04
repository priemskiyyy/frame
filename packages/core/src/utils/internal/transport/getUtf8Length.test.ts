import { expect, test } from "vitest";
import { getUtf8Length } from "src/utils/internal/transport/getUtf8Length";

test("ASCII counts one byte per character", () => {
  expect(getUtf8Length('{"days":12}')).toBe(11);
});

test("two byte characters count two bytes", () => {
  expect(getUtf8Length("é")).toBe(2);
});

test("three byte characters count three bytes", () => {
  expect(getUtf8Length("€")).toBe(3);
});

test("a surrogate pair counts four bytes, once", () => {
  expect(getUtf8Length("😀")).toBe(4);
});

test("the length steps up at each code unit boundary", () => {
  expect(getUtf8Length("\u007f")).toBe(1);
  expect(getUtf8Length("\u0080")).toBe(2);
  expect(getUtf8Length("\u07ff")).toBe(2);
  expect(getUtf8Length("\u0800")).toBe(3);
  expect(getUtf8Length("\ud7ff")).toBe(3);
  expect(getUtf8Length("\ud800\udc00")).toBe(4);
  expect(getUtf8Length("\udbff\udfff")).toBe(4);
  expect(getUtf8Length("\ue000")).toBe(3);
});

test("an empty text has no length", () => {
  expect(getUtf8Length("")).toBe(0);
});
