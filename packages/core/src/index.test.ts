import { expect, test } from "vitest";
import * as adapter from "src/adapter";
import * as api from "src/index";
import * as mock from "src/mock";
import * as testing from "src/testing";

test("the public entry exports exactly these runtime names", () => {
  expect(Object.keys(api).sort()).toEqual(["Frame", "FrameError", "widget"]);
});

test("the mock entry exports exactly these runtime names", () => {
  expect(Object.keys(mock).sort()).toEqual([
    "createMockAdapter",
    "createTestClock",
    "settle",
  ]);
});

test("the adapter entry exports types only, so an adapter has no runtime dependency on the core", () => {
  expect(Object.keys(adapter)).toEqual([]);
});

test("the testing entry exports exactly these runtime names", () => {
  expect(Object.keys(testing)).toEqual(["testWidgetAdapter"]);
});
