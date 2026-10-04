import type { MockResolution } from "src/mock/types/MockResolution";
import { getMockError } from "src/mock/utils/getMockError";
import type { JsonRecord } from "src/types/JsonRecord";
import type { ReadbackAnswer } from "src/types/ReadbackAnswer";
import type { TimelineEntry } from "src/types/TimelineEntry";
import { assertUnreachable } from "src/utils/common/assertUnreachable";

/** A read has no unknown effect: only `fail` answers a failure, and the rest of the failing plans throw. */
export const toReadbackAnswer = (
  resolution: MockResolution,
  stored: TimelineEntry<JsonRecord>[],
): ReadbackAnswer => {
  if (resolution.outcome === "succeed" || resolution.outcome === "skip") {
    return { status: "read", entries: stored };
  }

  if (resolution.outcome === "fail") {
    return { status: "failed", error: getMockError(resolution.error) };
  }

  if (resolution.outcome === "indeterminate") {
    throw getMockError(resolution.error);
  }

  if (resolution.outcome === "throw") {
    throw resolution.error;
  }

  return assertUnreachable(resolution);
};
