import type { PublicationOutcome } from "@priemskiyyy/frame";
import { expect, test } from "vitest";

import { explainOutcome } from "src/utils/explainOutcome";

const request = { id: "r7" };

const OUTCOMES = {
  submitted: {
    request,
    status: "submitted",
    kind: "snapshot",
    revision: 1,
    evidence: "sdk-call-returned",
  },
  unchanged: { request, status: "unchanged", revision: 1 },
  superseded: { request, status: "superseded", by: { id: "r9" } },
  skipped: { request, status: "skipped", reason: "no-placements" },
  invalid: {
    request,
    status: "invalid",
    reason: "schema-rejected",
    issues: [{ path: "days", message: "Too small" }],
  },
  unavailable: {
    request,
    status: "unavailable",
    reason: "No adapter hosts this widget.",
    remediation: null,
  },
  failed: { request, status: "failed", error: new Error("layout threw") },
  indeterminate: {
    request,
    status: "indeterminate",
    reason: "timeout",
    error: null,
  },
  blocked: { request, status: "blocked" },
  expired: { request, status: "expired" },
  disposed: { request, status: "disposed" },
} satisfies Record<PublicationOutcome["status"], PublicationOutcome>;

test("every way a request can end has a sentence of its own", () => {
  const sentences = Object.values(OUTCOMES).map(explainOutcome);

  expect(new Set(sentences).size).toBe(Object.keys(OUTCOMES).length);

  for (const sentence of sentences) {
    expect(sentence).not.toBe("");
  }
});

test("a submission says the call returned and never that the widget redrew", () => {
  expect(explainOutcome(OUTCOMES.submitted)).toBe(
    "The provider call returned. The home screen redraws on its own schedule, so this is not proof it has.",
  );
  expect(
    explainOutcome({ ...OUTCOMES.submitted, evidence: "simulated" }),
  ).toContain("No home screen is involved");
});

test("a superseded request names the one that replaced it", () => {
  expect(explainOutcome(OUTCOMES.superseded)).toContain("Request r9");
});

test("a refusal names its reason and the first issue", () => {
  expect(explainOutcome(OUTCOMES.invalid)).toBe(
    "Refused before any provider call (schema-rejected): Too small",
  );
});

test("an unavailable widget answers the adapter's own reason", () => {
  expect(explainOutcome(OUTCOMES.unavailable)).toBe(
    "No adapter hosts this widget.",
  );
});

test("an uncertain call says whether it outlived its deadline", () => {
  expect(explainOutcome(OUTCOMES.indeterminate)).toContain(
    "outlived its deadline",
  );
  expect(
    explainOutcome({ ...OUTCOMES.indeterminate, reason: "provider-error" }),
  ).toContain("did not complete cleanly");
});

test("a reload that was acknowledged reads like a submission", () => {
  expect(
    explainOutcome({
      request,
      status: "submitted",
      evidence: "sdk-call-returned",
    }),
  ).toBe(explainOutcome(OUTCOMES.submitted));
});
