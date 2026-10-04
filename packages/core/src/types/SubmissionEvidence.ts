/**
 * The furthest boundary a submission is known to have reached. None of them
 * claims that a widget was rendered, or is visible.
 *
 * - `sdk-call-returned`: the provider's call returned without throwing, and
 *   the provider gave no later signal.
 * - `sdk-promise-resolved`: the promise of the provider's call resolved.
 * - `simulated`: a mock answered. It is never evidence about a device.
 *
 * @example
 * ```ts
 * const evidence: SubmissionEvidence = "sdk-call-returned";
 * ```
 */
export type SubmissionEvidence =
  "sdk-call-returned" | "sdk-promise-resolved" | "simulated";
