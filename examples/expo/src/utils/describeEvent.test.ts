import type { FrameDiagnosticEvent } from "@priemskiyyy/frame";
import { expect, test } from "vitest";

import { describeEvent } from "src/utils/describeEvent";

const widget = { key: "streak" };

const EVENTS = {
  "widget-preparing": { timestamp: 1, type: "widget-preparing", widget },
  "widget-ready": { timestamp: 2, type: "widget-ready", widget },
  "widget-unavailable": { timestamp: 3, type: "widget-unavailable", widget },
  "widget-prepare-failed": {
    timestamp: 4,
    type: "widget-prepare-failed",
    widget,
  },
  "widget-dispose-failed": {
    timestamp: 5,
    type: "widget-dispose-failed",
    widget,
  },
  "request-accepted": {
    timestamp: 6,
    type: "request-accepted",
    widget,
    request: { id: "r1" },
    revision: 4,
  },
  "request-settled": {
    timestamp: 7,
    type: "request-settled",
    widget,
    request: { id: "r1" },
    outcome: { status: "submitted" },
  },
  "write-domain-blocked": {
    timestamp: 8,
    type: "write-domain-blocked",
    writeDomain: { name: "mock:StreakWidget" },
  },
  "write-domain-unblocked": {
    timestamp: 9,
    type: "write-domain-unblocked",
    writeDomain: { name: "mock:StreakWidget" },
    result: { status: "answered" },
  },
  "context-started": {
    timestamp: 10,
    type: "context-started",
    epoch: 2,
    reset: "fallback",
  },
  "frame-disposed": { timestamp: 11, type: "frame-disposed" },
} satisfies {
  [TType in FrameDiagnosticEvent["type"]]: Extract<
    FrameDiagnosticEvent,
    { type: TType }
  >;
};

test("every event Frame reports is described with a label, a detail and a tone", () => {
  for (const event of Object.values(EVENTS)) {
    const { label, detail, tone } = describeEvent(event);

    expect(label).not.toBe("");
    expect(detail).not.toBe("");
    expect(["neutral", "info", "positive", "warning", "danger"]).toContain(
      tone,
    );
  }
});

test("an event names the facts it carries and never a value", () => {
  expect(describeEvent(EVENTS["request-accepted"]).detail).toBe(
    "r1 is the wanted value, revision 4",
  );
  expect(describeEvent(EVENTS["request-settled"]).detail).toBe(
    "r1 ended submitted",
  );
  expect(describeEvent(EVENTS["write-domain-blocked"]).detail).toContain(
    "mock:StreakWidget",
  );
  expect(describeEvent(EVENTS["write-domain-unblocked"]).detail).toContain(
    "the stuck call answered",
  );
  expect(describeEvent(EVENTS["context-started"]).detail).toBe(
    "epoch 2, reset fallback",
  );
});

test("a failure to open is loud, a failure to release is a warning, and opening is quiet", () => {
  expect(describeEvent(EVENTS["widget-prepare-failed"]).tone).toBe("danger");
  expect(describeEvent(EVENTS["widget-dispose-failed"]).tone).toBe("warning");
  expect(describeEvent(EVENTS["widget-preparing"]).tone).toBe("neutral");
});
