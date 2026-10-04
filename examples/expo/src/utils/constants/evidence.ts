import type { SubmissionEvidence } from "@priemskiyyy/frame";

/** The boundary each kind of evidence names, in the words the page uses. */
export const EVIDENCE_LABELS = {
  "sdk-call-returned": "The SDK call returned",
  "sdk-promise-resolved": "The SDK promise resolved",
  simulated: "Simulated, not a device",
} satisfies Record<SubmissionEvidence, string>;
