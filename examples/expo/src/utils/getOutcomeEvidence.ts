import type { PublicationOutcome, ReloadOutcome } from "@priemskiyyy/frame";

import { EVIDENCE_LABELS } from "src/utils/constants/evidence";

/** The boundary a submission reached, in the words the page uses, or `null` when nothing was submitted. */
export const getOutcomeEvidence = (
  outcome: PublicationOutcome | ReloadOutcome,
) => {
  if (outcome.status !== "submitted") {
    return null;
  }

  return EVIDENCE_LABELS[outcome.evidence];
};
