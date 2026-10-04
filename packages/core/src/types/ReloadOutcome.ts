import type { RequestFailure } from "src/types/RequestFailure";
import type { SubmissionEvidence } from "src/types/SubmissionEvidence";

/**
 * How one `reload` ended. `submitted` acknowledges the request to the
 * host, never a render.
 *
 * @example
 * ```ts
 * const outcome = await widget.reload();
 * ```
 */
export type ReloadOutcome = { request: { id: string } } & (
  | { status: "submitted"; evidence: SubmissionEvidence }
  | { status: "skipped"; reason: "no-placements" }
  | RequestFailure
);
