import type { MockResolution } from "src/mock/types/MockResolution";
import { getMockError } from "src/mock/utils/getMockError";
import type { SubmissionResult } from "src/types/SubmissionResult";
import { assertUnreachable } from "src/utils/common/assertUnreachable";

/** Turns how a mock call ends into what an adapter answers; a `throw` throws. */
export const toSubmissionResult = (
  resolution: MockResolution,
  store: () => void,
): SubmissionResult => {
  if (resolution.outcome === "succeed") {
    store();

    return { status: "submitted", evidence: "simulated" };
  }

  if (resolution.outcome === "skip") {
    return { status: "skipped", reason: "no-placements" };
  }

  if (resolution.outcome === "fail") {
    return { status: "failed", error: getMockError(resolution.error) };
  }

  if (resolution.outcome === "indeterminate") {
    if (resolution.stored === true) {
      store();
    }

    return { status: "indeterminate", error: getMockError(resolution.error) };
  }

  if (resolution.outcome === "throw") {
    if (resolution.stored === true) {
      store();
    }

    throw resolution.error;
  }

  return assertUnreachable(resolution);
};
