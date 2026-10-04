import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";
import { toError } from "src/utils/internal/errors/toError";

test("an Error is returned as it is, whatever its tag says it is", () => {
  class Tagged extends Error {
    get [Symbol.toStringTag]() {
      return "Tagged";
    }
  }

  const plain = new Error("native");
  const tagged = new Tagged("tagged");

  expect(toError(plain)).toBe(plain);
  expect(toError(tagged)).toBe(tagged);
});

test("an Error made in another realm is the provider's own, and is returned as it is", () => {
  const foreign: Error = runInNewContext("new Error('native failure')");

  expect(foreign instanceof Error).toBe(false);
  expect(toError(foreign)).toBe(foreign);
});

test("a thrown value that is not an Error becomes a FrameError that says so", () => {
  for (const thrown of [
    "text",
    7,
    null,
    undefined,
    { message: "looks like one" },
  ]) {
    const error = toError(thrown);

    expect(error).toMatchObject({
      name: "FrameError",
      code: "PROVIDER_FAILED",
      message: "A provider threw a value that is not an Error.",
    });
  }
});
