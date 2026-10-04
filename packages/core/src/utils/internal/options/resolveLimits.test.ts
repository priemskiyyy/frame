import { expect, test } from "vitest";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { resolveLimits } from "src/utils/internal/options/resolveLimits";

test("a Frame that sets no limits gets the documented ones", () => {
  expect(resolveLimits()).toEqual({
    depth: 64,
    nodes: 50_000,
    bytes: 262_144,
    entries: 64,
  });
  expect(resolveLimits({})).toEqual(DEFAULT_LIMITS);
  expect(Object.isFrozen(DEFAULT_LIMITS)).toBe(true);
});

test("a limit that is undefined is the default, as an absent one is", () => {
  expect(
    resolveLimits({ depth: undefined, nodes: undefined, entries: undefined }),
  ).toEqual(DEFAULT_LIMITS);
});

test("a limit that is given replaces only its own default", () => {
  expect(resolveLimits({ bytes: 100, entries: 2 })).toEqual({
    depth: 64,
    nodes: 50_000,
    bytes: 100,
    entries: 2,
  });
});

test("every limit must be a positive integer, and the message names it", () => {
  for (const name of ["depth", "nodes", "bytes", "entries"]) {
    for (const value of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      2 ** 53,
    ]) {
      expect(() => resolveLimits({ [name]: value })).toThrowError(
        expect.objectContaining({
          name: "FrameError",
          code: "INVALID_CONFIGURATION",
          message: `limits.${name} is a positive integer, not ${value}.`,
        }),
      );
    }
  }
});

test("the first limit that cannot work is the one named", () => {
  expect(() => resolveLimits({ entries: 0, depth: 0 })).toThrowError(
    "limits.depth is a positive integer, not 0.",
  );
});
