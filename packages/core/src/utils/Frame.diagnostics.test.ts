import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { settle } from "src/mock/settle";
import type { FrameDiagnosticEvent } from "src/types/FrameDiagnosticEvent";
import { captureRethrown } from "src/utils/common/captureRethrown.fixture";
import { Frame } from "src/utils/Frame";
import { createStreakFrame, ready, streak } from "src/utils/Frame.fixture";

const collect = (frame: ReturnType<typeof createStreakFrame>["frame"]) => {
  const events: FrameDiagnosticEvent[] = [];

  frame.diagnostics.events.subscribe((event) => events.push(event));

  return events;
};

test("a publication leaves a trail of events that names the request and never the data", async () => {
  const { frame, widget } = createStreakFrame();
  const events = collect(frame);

  await widget.publish(ready(12));

  expect(events.map(({ type }) => type)).toEqual([
    "request-accepted",
    "widget-preparing",
    "widget-ready",
    "request-settled",
  ]);
  expect(events[0]).toEqual({
    timestamp: 1_000_000,
    type: "request-accepted",
    widget: { key: "streak" },
    request: { id: "r1" },
    revision: 1,
  });
  expect(events[3]).toMatchObject({
    type: "request-settled",
    outcome: { status: "submitted" },
  });
  expect(JSON.stringify(events)).not.toContain("12");
});

test("an invalid request is settled with its status and no payload", async () => {
  const { frame, widget } = createStreakFrame();
  const events = collect(frame);

  await widget.publish({ state: "ready", days: -1 });

  expect(events).toEqual([
    {
      timestamp: 1_000_000,
      type: "request-settled",
      widget: { key: "streak" },
      request: { id: "r1" },
      outcome: { status: "invalid" },
    },
  ]);
});

test("a stuck call and its release are events of the write domain", async () => {
  const { frame, widget, control, clock } = createStreakFrame(
    {},
    { timeout: 100 },
  );

  const events = collect(frame);

  control.script({ outcome: "hold" });
  widget.publish(ready(1));
  await settle();
  clock.advance(100);
  control.held()[0]?.release();
  await settle();

  const writeDomain = events.filter(({ type }) =>
    type.startsWith("write-domain-"),
  );

  expect(writeDomain).toEqual([
    {
      timestamp: 1_000_100,
      type: "write-domain-blocked",
      writeDomain: { name: "mock:StreakWidget" },
    },
    {
      timestamp: 1_000_100,
      type: "write-domain-unblocked",
      writeDomain: { name: "mock:StreakWidget" },
      result: { status: "answered" },
    },
  ]);
});

test("a context change and disposal are events", async () => {
  const { frame } = createStreakFrame();
  const events = collect(frame);

  await frame.context({ reset: "preserve" });
  frame.dispose();

  expect(events.map(({ type }) => type)).toEqual([
    "context-started",
    "frame-disposed",
  ]);
  expect(events[0]).toMatchObject({ epoch: 2, reset: "preserve" });
});

test("an unavailable adapter and a failed open are events", async () => {
  const unavailable = createStreakFrame({ unavailable: { reason: "No." } });
  const unavailableEvents = collect(unavailable.frame);

  await unavailable.frame.prepare();

  expect(unavailableEvents.map(({ type }) => type)).toEqual([
    "widget-preparing",
    "widget-unavailable",
  ]);

  const { adapter } = createMockAdapter(streak);

  const failing = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          throw new Error("native module missing");
        },
      },
    ],
  });

  const failedEvents = collect(failing);

  await failing.prepare();

  expect(failedEvents.map(({ type }) => type)).toEqual([
    "widget-preparing",
    "widget-prepare-failed",
  ]);
  expect(failedEvents[1]).toMatchObject({ widget: { key: "streak" } });
});

test("the snapshot names widgets and counts, and never carries a value", async () => {
  const { frame, widget } = createStreakFrame();

  await widget.publish(ready(77));
  await settle();

  expect(frame.diagnostics.get()).toEqual({
    state: "active",
    epoch: 1,
    widgets: {
      streak: {
        name: "StreakWidget",
        adapter: { name: "mock" },
        lifecycle: "ready",
        desired: { state: "accepted", origin: "publication", revision: 1 },
        work: "idle",
        latest: "submitted",
      },
    },
  });
  expect(JSON.stringify(frame.diagnostics.get())).not.toContain("77");
});

test("the snapshot's widgets are keyed by the registered names", () => {
  const { frame } = createStreakFrame();
  const { widgets } = frame.diagnostics.get();

  expect(Object.keys(widgets)).toEqual(["streak"]);
  expect(widgets.streak.name).toBe("StreakWidget");
});

test("the snapshot is the same object until something changes, and subscribers hear changes", async () => {
  const { frame, widget } = createStreakFrame();
  const seen: ReturnType<typeof frame.diagnostics.get>[] = [];

  frame.diagnostics.subscribe(() => seen.push(frame.diagnostics.get()));

  const before = frame.diagnostics.get();

  expect(frame.diagnostics.get()).toBe(before);

  await widget.publish(ready(1));
  await settle();

  expect(frame.diagnostics.get()).not.toBe(before);
  expect(seen.at(-1)).toBe(frame.diagnostics.get());
  expect(seen.at(-1)?.widgets.streak.latest).toBe("submitted");
});

test("a Frame with no widgets still tells its subscribers about a context change and a disposal", async () => {
  const frame = new Frame({ widgets: {} });
  let heard = 0;

  frame.diagnostics.get();
  frame.diagnostics.subscribe(() => {
    heard += 1;
  });

  await frame.context({ reset: "preserve" });

  expect(heard).toBe(1);
  expect(frame.diagnostics.get().epoch).toBe(2);

  frame.dispose();

  expect(heard).toBe(2);
  expect(frame.diagnostics.get().state).toBe("disposed");
});

test("observing diagnostics calls no provider", () => {
  const { frame, control } = createStreakFrame();

  frame.diagnostics.get();
  frame.diagnostics.subscribe(() => {});
  frame.diagnostics.events.subscribe(() => {});

  expect(control.sessions()).toBe(0);
  expect(control.calls()).toEqual([]);
});

test("an event listener that throws stops no other and never changes an outcome", async () => {
  const { frame, widget } = createStreakFrame();
  const rethrown = captureRethrown();
  const heard: string[] = [];

  frame.diagnostics.events.subscribe(() => {
    throw new Error("listener failed");
  });
  frame.diagnostics.events.subscribe((event) => heard.push(event.type));

  const outcome = await widget.publish(ready(1));

  expect(outcome.status).toBe("submitted");
  expect(heard).toEqual([
    "request-accepted",
    "widget-preparing",
    "widget-ready",
    "request-settled",
  ]);
  expect(rethrown().map((error) => error.message)).toEqual([
    "listener failed",
    "listener failed",
    "listener failed",
    "listener failed",
  ]);
});

test("an unsubscribed listener hears nothing more", async () => {
  const { frame, widget } = createStreakFrame();
  const heard: string[] = [];

  const stop = frame.diagnostics.events.subscribe((event) =>
    heard.push(event.type),
  );

  stop();
  await widget.publish(ready(1));

  expect(heard).toEqual([]);
});
