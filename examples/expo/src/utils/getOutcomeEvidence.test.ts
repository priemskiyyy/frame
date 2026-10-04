import { expect, test } from "vitest";

import { EVIDENCE_LABELS } from "src/utils/constants/evidence";
import { getOutcomeEvidence } from "src/utils/getOutcomeEvidence";

test("a submission names the boundary it reached, in the page's words", () => {
  expect(
    getOutcomeEvidence({
      request: { id: "r1" },
      status: "submitted",
      kind: "snapshot",
      revision: 1,
      evidence: "sdk-call-returned",
    }),
  ).toBe("The SDK call returned");
  expect(
    getOutcomeEvidence({
      request: { id: "r2" },
      status: "submitted",
      kind: "timeline",
      revision: 2,
      evidence: "sdk-promise-resolved",
    }),
  ).toBe("The SDK promise resolved");
  expect(
    getOutcomeEvidence({
      request: { id: "r3" },
      status: "submitted",
      kind: "snapshot",
      revision: 3,
      evidence: "simulated",
    }),
  ).toBe("Simulated, not a device");
});

test("a reload that was submitted names its evidence the same way", () => {
  expect(
    getOutcomeEvidence({
      request: { id: "r4" },
      status: "submitted",
      evidence: "simulated",
    }),
  ).toBe(EVIDENCE_LABELS.simulated);
});

test("an outcome that submitted nothing has no evidence", () => {
  expect(
    getOutcomeEvidence({
      request: { id: "r5" },
      status: "unchanged",
      revision: 1,
    }),
  ).toBeNull();
  expect(
    getOutcomeEvidence({ request: { id: "r6" }, status: "blocked" }),
  ).toBeNull();
});
