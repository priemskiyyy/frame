import { expect, test } from "vitest";
import { getStopFailure } from "src/utils/internal/widgets/getStopFailure";

test("each way the lane ends a task is a failure of its own, and none is a success", () => {
  const error = new Error("native");

  expect(getStopFailure({ status: "threw", error })).toEqual({
    status: "indeterminate",
    reason: "provider-error",
    error,
  });
  expect(getStopFailure({ status: "timeout" })).toEqual({
    status: "indeterminate",
    reason: "timeout",
    error: null,
  });
  expect(getStopFailure({ status: "abandoned" })).toEqual({
    status: "indeterminate",
    reason: "disposed",
    error: null,
  });
  expect(getStopFailure({ status: "blocked" })).toEqual({ status: "blocked" });
  expect(getStopFailure({ status: "disposed" })).toEqual({
    status: "disposed",
  });
});

test("a stop no type allows is refused loudly rather than answered", () => {
  // @ts-expect-error a string is not a lane stop
  expect(() => getStopFailure({ status: "paused" })).toThrowError(
    'Unexpected value: {"status":"paused"}',
  );
});
