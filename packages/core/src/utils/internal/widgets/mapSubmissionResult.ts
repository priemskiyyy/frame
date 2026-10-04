import type { RequestFailure } from "src/types/RequestFailure";
import type { SubmissionEvidence } from "src/types/SubmissionEvidence";
import type { SubmissionResult } from "src/types/SubmissionResult";
import { getInvalidAnswer } from "src/utils/internal/widgets/getInvalidAnswer";

type Mapped =
  | { status: "submitted"; evidence: SubmissionEvidence }
  | { status: "skipped"; reason: "no-placements" }
  | RequestFailure;

// An answer outside the contract throws, which the lane reads as an indeterminate call.
export const mapSubmissionResult = (answer: SubmissionResult): Mapped => {
  // A call that forgot to return answers nothing at all.
  if (answer === null || typeof answer !== "object") {
    throw getInvalidAnswer(answer);
  }

  if (answer.status === "submitted") {
    return { status: "submitted", evidence: answer.evidence };
  }

  if (answer.status === "skipped") {
    return { status: "skipped", reason: answer.reason };
  }

  if (answer.status === "failed") {
    return { status: "failed", error: answer.error };
  }

  if (answer.status === "indeterminate") {
    return {
      status: "indeterminate",
      reason: "provider-error",
      error: answer.error,
    };
  }

  throw getInvalidAnswer(answer);
};
