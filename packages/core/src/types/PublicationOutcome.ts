import type { InvalidIssue } from "src/types/InvalidIssue";
import type { InvalidReason } from "src/types/InvalidReason";
import type { RequestFailure } from "src/types/RequestFailure";
import type { SubmissionEvidence } from "src/types/SubmissionEvidence";

/**
 * How one `publish`, `reset` or `publishTimeline` ended: the promise never
 * rejects, and no outcome says the widget is on screen.
 *
 * - `submitted`: the adapter reached the boundary named by `evidence`.
 * - `unchanged`: the same content was already submitted, so nothing was sent.
 *   Pass `{ force: true }` to send it anyway.
 * - `superseded`: a newer request replaced this one before it reached the
 *   provider, so it was never sent.
 * - `skipped`: the provider reported no placed widget to draw.
 * - `invalid`: Frame refused the value, so nothing was accepted.
 * - the rest are in `RequestFailure`.
 *
 * @example
 * ```ts
 * const outcome = await widget.publish({ days: 12 });
 * if (outcome.status === "invalid") console.warn(outcome.reason, outcome.issues);
 * ```
 */
export type PublicationOutcome = { request: { id: string } } & (
  | {
      status: "submitted";
      kind: "snapshot" | "timeline";
      /** Counts the requests this context accepted, from 1. */
      revision: number;
      evidence: SubmissionEvidence;
    }
  | { status: "unchanged"; revision: number }
  /** `by` is the request that replaced this one. */
  | { status: "superseded"; by: { id: string } }
  | { status: "skipped"; reason: "no-placements" }
  | { status: "invalid"; reason: InvalidReason; issues: InvalidIssue[] }
  | RequestFailure
);
