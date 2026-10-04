import { expect, test } from "vitest";
import { assertUnreachable } from "src/utils/common/assertUnreachable";

test("a value no type allows throws, and the error prints it", () => {
  // @ts-expect-error a string is not never
  expect(() => assertUnreachable("surprise")).toThrowError(
    'Unexpected value: "surprise"',
  );
});
