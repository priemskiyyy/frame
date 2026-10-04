import type { LaneStop } from "src/types/internal/LaneStop";
import type { RequestFailure } from "src/types/RequestFailure";
import { assertUnreachable } from "src/utils/common/assertUnreachable";

export const getStopFailure = (stop: LaneStop): RequestFailure => {
  if (stop.status === "threw") {
    return {
      status: "indeterminate",
      reason: "provider-error",
      error: stop.error,
    };
  }

  if (stop.status === "timeout") {
    return { status: "indeterminate", reason: "timeout", error: null };
  }

  if (stop.status === "abandoned") {
    return { status: "indeterminate", reason: "disposed", error: null };
  }

  if (stop.status === "blocked") {
    return { status: "blocked" };
  }

  if (stop.status === "disposed") {
    return { status: "disposed" };
  }

  return assertUnreachable(stop);
};
