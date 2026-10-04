import { expect, test } from "vitest";

import { getOutcomeDetail } from "src/utils/getOutcomeDetail";

const request = { id: "r1" };

test("a submission carries its revision and the boundary it reached, an unchanged request its revision", () => {
  expect(
    getOutcomeDetail({
      request,
      status: "submitted",
      kind: "timeline",
      revision: 3,
      evidence: "simulated",
    }),
  ).toBe("revision 3, timeline, simulated");
  expect(getOutcomeDetail({ request, status: "unchanged", revision: 2 })).toBe(
    "revision 2",
  );
});

test("a superseded request names its replacement", () => {
  expect(
    getOutcomeDetail({ request, status: "superseded", by: { id: "r5" } }),
  ).toBe("replaced by r5");
});

test("a refusal lists each issue, with its path unless it is about the whole value", () => {
  expect(
    getOutcomeDetail({
      request,
      status: "invalid",
      reason: "schema-rejected",
      issues: [
        { path: "days", message: "Too small" },
        { path: "", message: "Not a record" },
      ],
    }),
  ).toBe("days: Too small / Not a record");
});

test("an outcome with nothing more to say has no detail", () => {
  expect(getOutcomeDetail({ request, status: "blocked" })).toBeNull();
});
