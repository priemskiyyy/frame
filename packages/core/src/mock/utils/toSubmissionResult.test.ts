import { expect, test } from "vitest";
import { toSubmissionResult } from "src/mock/utils/toSubmissionResult";

test("an outcome the plans do not have is refused, never answered", () => {
  const refuse = () =>
    // @ts-expect-error a resolution has no such outcome
    toSubmissionResult({ outcome: "unknown" }, () => {});

  expect(refuse).toThrowError('Unexpected value: {"outcome":"unknown"}');
});
