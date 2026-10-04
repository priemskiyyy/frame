import { expect, test } from "vitest";
import { toReadbackAnswer } from "src/mock/utils/toReadbackAnswer";

test("an outcome the plans do not have is refused, never answered", () => {
  const refuse = () =>
    // @ts-expect-error a resolution has no such outcome
    toReadbackAnswer({ outcome: "unknown" }, []);

  expect(refuse).toThrowError('Unexpected value: {"outcome":"unknown"}');
});
