import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetData } from "src/types/WidgetData";
import type { WidgetOpening } from "src/types/WidgetOpening";
import { captureRethrown } from "src/utils/common/captureRethrown.fixture";
import { widget } from "src/utils/widget";
import { Frame } from "src/utils/Frame";
import { createStreakFrame, ready, streak } from "src/utils/Frame.fixture";

type StreakData = WidgetData<typeof streak>;

test("a handle starts idle: reading opens nothing", () => {
  const { widget, control } = createStreakFrame();

  expect(widget.status.get()).toEqual({
    lifecycle: { state: "idle" },
    desired: { state: "absent" },
    work: "idle",
    latest: null,
  });
  expect(widget.get()).toBeNull();
  expect(control.sessions()).toBe(0);
});

test("publishing opens the adapter", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(1));

  expect(widget.status.get().lifecycle).toEqual({ state: "ready" });
  expect(control.sessions()).toBe(1);
});

test("prepare opens every adapter once, however many ask at the same time", async () => {
  const { frame, control } = createStreakFrame();

  const [first, second] = await Promise.all([frame.prepare(), frame.prepare()]);

  expect(first).toEqual({ widgets: { streak: { status: "ready" } } });
  expect(second).toEqual(first);
  expect(control.sessions()).toBe(1);
});

test("an unavailable adapter answers with its reason and calls no provider", async () => {
  const { widget, frame, control } = createStreakFrame({
    unavailable: { reason: "No host.", remediation: "Use a device." },
  });

  const outcome = await widget.publish(ready(1));

  expect(outcome).toEqual({
    request: { id: "r1" },
    status: "unavailable",
    reason: "No host.",
    remediation: "Use a device.",
  });
  expect(widget.status.get().lifecycle).toEqual({
    state: "unavailable",
    reason: "No host.",
    remediation: "Use a device.",
  });
  expect((await frame.prepare()).widgets.streak).toEqual({
    status: "unavailable",
    reason: "No host.",
    remediation: "Use a device.",
  });
  expect(control.sessions()).toBe(0);
});

test("an unavailable answer is kept by publish and asked again by prepare", async () => {
  let opens = 0;
  const widgetDefinition = widget({ ...streak });
  const { adapter } = createMockAdapter(widgetDefinition);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          opens += 1;

          return { status: "unavailable", reason: "No.", remediation: null };
        },
      },
    ],
  });

  await frame.widget("streak").publish(ready(1));
  await frame.widget("streak").publish(ready(2));

  expect(opens).toBe(1);

  await frame.prepare();

  expect(opens).toBe(2);
});

test("an adapter that throws while opening fails, and the next publish tries again", async () => {
  const { adapter } = createMockAdapter(streak);
  const error = new Error("native module missing");
  let attempts = 0;

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          attempts += 1;

          if (attempts === 1) {
            throw error;
          }

          return adapter.open();
        },
      },
    ],
  });

  const widget = frame.widget("streak");

  const first = await widget.publish(ready(1));

  expect(first).toMatchObject({ status: "failed", error });
  expect(widget.status.get().lifecycle).toEqual({ state: "failed", error });
  expect((await widget.publish(ready(1))).status).toBe("submitted");
  expect(widget.status.get().lifecycle).toEqual({ state: "ready" });
});

test("a failed open is reported by prepare, not thrown", async () => {
  const { adapter } = createMockAdapter(streak);
  const error = new Error("boom");

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          throw error;
        },
      },
    ],
  });

  expect(await frame.prepare()).toEqual({
    widgets: { streak: { status: "failed", error } },
  });
});

test("a provider that throws something that is not an Error is still an outcome", async () => {
  const { adapter } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          throw "not an error";
        },
      },
    ],
  });

  const outcome = await frame.widget("streak").publish(ready(1));

  expect(outcome).toMatchObject({ status: "failed" });
  expect(outcome.status === "failed" && outcome.error.name).toBe("FrameError");
});

test("the status is the same object until a field changes", async () => {
  const { widget } = createStreakFrame();
  const before = widget.status.get();

  expect(widget.status.get()).toBe(before);

  await widget.publish(ready(1));

  const after = widget.status.get();

  expect(after).not.toBe(before);
  expect(widget.status.get()).toBe(after);
});

test("status listeners are told about each change, and never about a no-op", async () => {
  const { widget } = createStreakFrame();
  const seen: string[] = [];

  widget.status.subscribe(() => {
    const { lifecycle, work } = widget.status.get();

    seen.push(`${lifecycle.state}:${work}`);
  });

  await widget.publish(ready(1));
  await settle();
  seen.length = 0;
  await widget.publish(ready(1));
  await settle();

  expect(seen).toEqual(["ready:submitting", "ready:idle"]);
});

test("data listeners hear only when the desired value changes", async () => {
  const { widget } = createStreakFrame();
  let heard = 0;

  widget.subscribe(() => {
    heard += 1;
  });

  await widget.publish(ready(1));
  await widget.publish(ready(1));
  await widget.publish(ready(2));

  expect(heard).toBe(2);
});

test("a listener that throws stops no other and reaches error reporting", async () => {
  const { widget } = createStreakFrame();
  const rethrown = captureRethrown();
  const heard: number[] = [];

  widget.subscribe(() => {
    throw new Error("listener failed");
  });
  widget.subscribe(() => heard.push(1));

  await widget.publish(ready(1));

  expect(heard).toEqual([1]);
  expect(rethrown().map((error) => error.message)).toEqual(["listener failed"]);
});

test("reset replaces the content with the fallback, and says where it came from", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(9));

  const outcome = await widget.reset();

  expect(outcome).toMatchObject({ status: "submitted", revision: 2 });
  expect(widget.get()).toEqual({ state: "empty" });
  expect(widget.status.get().desired).toEqual({
    state: "accepted",
    origin: "fallback",
    revision: 2,
  });
  expect(control.stored()[0]?.data).toEqual({ state: "empty" });
});

test("a fallback is not published by defining it, only by reset", () => {
  const { widget, control } = createStreakFrame();

  expect(widget.get()).toBeNull();
  expect(control.calls()).toEqual([]);
});

test("dispose settles waiting requests, ends the call in flight and releases the session", async () => {
  const { frame, widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const inFlight = widget.publish(ready(1));

  await settle();

  const waiting = widget.publish(ready(2));

  await settle();
  frame.dispose();

  expect(await inFlight).toMatchObject({
    status: "indeterminate",
    reason: "disposed",
  });
  expect(await waiting).toMatchObject({ status: "disposed" });
  expect(control.sessions()).toBe(0);
  expect(widget.status.get().lifecycle).toEqual({ state: "disposed" });
  expect(await widget.publish(ready(3))).toMatchObject({ status: "disposed" });
  expect(widget.get()).toBeNull();
});

test("dispose is idempotent, and announces the disposal once", () => {
  const { frame } = createStreakFrame();
  const heard: string[] = [];

  frame.diagnostics.events.subscribe((event) => heard.push(event.type));
  frame.dispose();
  frame.dispose();

  expect(frame.diagnostics.get().state).toBe("disposed");
  expect(heard).toEqual(["frame-disposed"]);
});

test("disposing tells a status listener once, with the lifecycle and the desired value changed together", async () => {
  const { frame, widget } = createStreakFrame();
  const seen: string[] = [];

  await widget.publish(ready(1));
  widget.status.subscribe(() => {
    const { lifecycle, desired } = widget.status.get();

    seen.push(`${lifecycle.state} ${desired.state}`);
  });
  frame.dispose();

  expect(seen).toEqual(["disposed absent"]);
});

test("a request still validating at disposal settles disposed", async () => {
  const { frame, widget } = createStreakFrame();

  const pending = widget.publish(ready(1));

  frame.dispose();

  expect(await pending).toMatchObject({ status: "disposed" });
});

test("disposing while an adapter is still opening releases the late session", async () => {
  const { adapter, control } = createMockAdapter(streak);

  let release: () => void = () => {};

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () =>
          new Promise((resolve) => {
            release = () => resolve(adapter.open());
          }),
      },
    ],
  });

  const outcome = frame.widget("streak").publish(ready(1));

  await settle();
  frame.dispose();
  release();

  expect(await outcome).toMatchObject({ status: "disposed" });

  await settle();

  expect(control.sessions()).toBe(0);
});

test("an unknown widget key throws INVALID_CONFIGURATION for a caller the types missed", () => {
  const { frame } = createStreakFrame();

  // @ts-expect-error there is no such widget
  expect(() => frame.widget("missing")).toThrowError(
    expect.objectContaining({
      name: "FrameError",
      code: "INVALID_CONFIGURATION",
      message: 'Frame has no widget named "missing".',
    }),
  );
});

test("an operation the adapter does not provide answers unavailable instead of succeeding as a no-op", async () => {
  const { adapter } = createMockAdapter(streak);

  const limited: WidgetAdapter<WidgetData<typeof streak>, "StreakWidget"> = {
    ...adapter,
    open: async () => {
      const opening = await adapter.open();

      if (opening.status !== "opened") {
        return opening;
      }

      return {
        status: "opened",
        session: {
          writeDomain: opening.session.writeDomain,
          publish: opening.session.publish,
        },
      };
    },
  };

  const frame = new Frame({ widgets: { streak }, adapters: [limited] });
  const widget = frame.widget("streak");

  expect(await widget.reload()).toMatchObject({
    status: "unavailable",
    reason: "The mock adapter does not provide reload.",
  });
  expect(
    await widget.publishTimeline([{ at: 0, data: { state: "empty" } }]),
  ).toMatchObject({
    status: "unavailable",
    reason: "The mock adapter does not provide publishTimeline.",
  });
});

test("an open that failed leaves no timer behind", async () => {
  const clock = createTestClock();
  const { adapter } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          throw new Error("native module missing");
        },
      },
    ],
    clock,
  });

  await frame.prepare();

  expect(clock.pending()).toBe(0);
});

test("an open that succeeded leaves no timer behind", async () => {
  const { frame, clock } = createStreakFrame();

  await frame.prepare();

  expect(clock.pending()).toBe(0);
});

test("a session that opens while the Frame is disposed is released, wherever in the turn the disposal lands", async () => {
  for (let turns = 0; turns < 8; turns += 1) {
    const { adapter, control } = createMockAdapter(streak);

    let answer: () => void = () => {};

    const frame = new Frame({
      widgets: { streak },
      adapters: [
        {
          ...adapter,
          open: () =>
            new Promise((resolve) => {
              answer = () => resolve(adapter.open());
            }),
        },
      ],
    });

    const outcome = frame.widget("streak").publish(ready(1));

    await settle();
    answer();

    for (let turn = 0; turn < turns; turn += 1) {
      await Promise.resolve();
    }

    frame.dispose();
    await outcome;
    await settle();

    expect(control.sessions()).toBe(0);
  }
});

test("a session whose asynchronous dispose rejects is reported as a failed disposal, never left unhandled", async () => {
  const { adapter } = createMockAdapter(streak);

  const bad = {
    ...adapter,
    open: async (): Promise<WidgetOpening<StreakData>> => {
      const opening = await adapter.open();

      if (opening.status !== "opened") {
        return opening;
      }

      return {
        status: "opened",
        session: {
          ...opening.session,
          dispose: () => Promise.reject(new Error("native dispose failed")),
        },
      };
    },
  };

  const frame = new Frame({ widgets: { streak }, adapters: [bad] });
  const events: string[] = [];

  await frame.widget("streak").publish(ready(1));
  frame.diagnostics.events.subscribe((event) => events.push(event.type));
  frame.dispose();
  await settle();

  expect(events).toEqual(["frame-disposed", "widget-dispose-failed"]);
});

test("an answer to open that comes after the deadline is dropped, whatever it says", async () => {
  const clock = createTestClock();
  const { adapter } = createMockAdapter(streak);

  let answer: (opening: WidgetOpening<StreakData>) => void = () => {};

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      },
    ],
    clock,
    timeout: 500,
  });

  const events: string[] = [];

  frame.diagnostics.events.subscribe((event) => events.push(event.type));

  const outcome = frame.widget("streak").publish(ready(1));

  await settle();
  clock.advance(500);

  expect(await outcome).toMatchObject({ status: "failed" });

  answer({ status: "unavailable", reason: "Too late.", remediation: null });
  await settle();

  expect(events).toEqual([
    "request-accepted",
    "widget-preparing",
    "widget-prepare-failed",
    "request-settled",
  ]);
  expect(frame.widget("streak").status.get().lifecycle).toMatchObject({
    state: "failed",
  });
});
