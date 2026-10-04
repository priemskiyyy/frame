import type { SubmissionEvidence } from "src/types/SubmissionEvidence";

/**
 * What an adapter answers for one operation, stating only what it knows. A
 * provider call that threw or rejected is `indeterminate` (throwing says the
 * same), and `failed` means nothing reached the provider.
 *
 * @example
 * ```ts
 * publish: (data) => {
 *   widget.updateSnapshot(data);
 *   return { status: "submitted", evidence: "sdk-call-returned" };
 * };
 * ```
 */
export type SubmissionResult =
  | { status: "submitted"; evidence: SubmissionEvidence }
  | { status: "skipped"; reason: "no-placements" }
  | { status: "failed"; error: Error }
  | { status: "indeterminate"; error: Error };
