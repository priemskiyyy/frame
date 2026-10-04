import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import type { WidgetData } from "src/types/WidgetData";
import type { streak } from "src/utils/Frame.fixture";
import {
  createGatedFrame,
  createStreakFrame,
  ready,
} from "src/utils/Frame.fixture";

test("a context change retires the old handle at once, before anything is awaited", async () => {
  const { frame, widget } = createStreakFrame();

  await widget.publish(ready(1));

  const next = frame.context({ reset: "preserve" });

  expect(widget.status.get().lifecycle).toEqual({ state: "retired" });
  expect(widget.get()).toBeNull();

  await next;
});

test("whoever hears a retirement is already given the handle that replaces it", async () => {
  const { frame, widget } = createStreakFrame();
  const heard: (typeof widget)[] = [];

  widget.status.subscribe(() => heard.push(frame.widget("streak")));

  const next = frame.context({ reset: "preserve" });

  expect(heard).toHaveLength(1);
  expect(heard[0]).toBe(frame.widget("streak"));
  expect(heard[0]).not.toBe(widget);

  await next;
});

test("a retired handle drops what it showed and tells its subscribers nothing new", async () => {
  const { frame, widget } = createStreakFrame();
  const seen: (WidgetData<typeof streak> | null)[] = [];

  await widget.publish(ready(1));
  widget.subscribe(() => seen.push(widget.get()));
  await frame.context({ reset: "preserve" });
  await frame.widget("streak").publish(ready(2));

  expect(seen).toEqual([null]);
  expect(widget.status.get().desired).toEqual({ state: "absent" });
  expect(widget.status.get().latest).toBeNull();
});

test("a retired handle never publishes into the next context", async () => {
  const { frame, widget, control } = createStreakFrame();

  await frame.context({ reset: "preserve" });

  expect(await widget.publish(ready(1))).toMatchObject({ status: "expired" });
  expect(await widget.reset()).toMatchObject({ status: "expired" });
  expect(control.calls()).toEqual([]);
  expect(frame.widget("streak").get()).toBeNull();
});

test("every context gets handles of its own, and the same one within it", async () => {
  const { frame, widget } = createStreakFrame();

  await frame.context({ reset: "preserve" });

  const next = frame.widget("streak");

  expect(next).not.toBe(widget);
  expect(frame.widget("streak")).toBe(next);
});

test("a request still validating when the context ends is expired and never sent", async () => {
  const { frame, widget, control, arm, gates } = createGatedFrame();

  arm();

  const pending = widget.publish({ n: 1 });

  await frame.context({ reset: "preserve" });
  gates[0]?.();

  expect(await pending).toMatchObject({ status: "expired" });
  expect(control.calls()).toEqual([]);
  expect(frame.widget("gated").get()).toBeNull();
});

test("a request waiting behind a call in flight is dropped when the context ends", async () => {
  const { frame, widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const inFlight = widget.publish(ready(1));

  await settle();

  const waiting = widget.publish(ready(2));

  await settle();
  frame.context({ reset: "preserve" });

  expect(await waiting).toMatchObject({ status: "expired" });

  control.held()[0]?.release();

  expect(await inFlight).toMatchObject({ status: "submitted" });
  expect(control.calls()).toHaveLength(1);
});

test("the call in flight when the context ends keeps its real outcome, and the next context queues behind it", async () => {
  const { frame, widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const inFlight = widget.publish(ready(1));

  await settle();

  const report = frame.context({ reset: "fallback" });

  await settle();

  expect(control.calls()).toHaveLength(1);

  control.held()[0]?.release();

  expect(await inFlight).toMatchObject({ status: "submitted" });
  expect((await report).widgets.streak).toMatchObject({ status: "submitted" });
  expect(control.stored()[0]?.data).toEqual({ state: "empty" });
  expect(control.calls().map((call) => call.operation)).toEqual([
    "publish",
    "publish",
  ]);
});

test("reset: fallback replaces every widget with its fallback before the new context publishes", async () => {
  const { frame, widget, control } = createStreakFrame();

  await widget.publish(ready(41));

  const { widgets } = await frame.context({ reset: "fallback" });
  const next = frame.widget("streak");

  expect(widgets.streak).toMatchObject({ status: "submitted" });
  expect(next.get()).toEqual({ state: "empty" });
  expect(next.status.get().desired).toMatchObject({
    state: "accepted",
    origin: "fallback",
  });
  expect(control.stored()[0]?.data).toEqual({ state: "empty" });
});

test("a context change with no options replaces every widget with its fallback", async () => {
  const { frame, widget, control } = createStreakFrame();

  await widget.publish(ready(5));

  const { widgets } = await frame.context();

  expect(widgets.streak).toMatchObject({ status: "submitted" });
  expect(frame.widget("streak").get()).toEqual({ state: "empty" });
  expect(control.stored()[0]?.data).toEqual({ state: "empty" });
});

test("the context report is frozen, and so is the one a disposed Frame answers", async () => {
  const { frame } = createStreakFrame();
  const report = await frame.context({ reset: "fallback" });

  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.widgets)).toBe(true);

  frame.dispose();

  const disposed = await frame.context();

  expect(Object.isFrozen(disposed)).toBe(true);
  expect(Object.isFrozen(disposed.widgets)).toBe(true);
});

test("reset: preserve touches no widget", async () => {
  const { frame, widget, control } = createStreakFrame();

  await widget.publish(ready(1));

  expect(await frame.context({ reset: "preserve" })).toEqual({ widgets: {} });
  expect(control.calls()).toHaveLength(1);
});

test("a widget that could not be reset reports why, and is not claimed erased", async () => {
  const { frame, control } = createStreakFrame();

  control.script({ outcome: "fail", error: new Error("no") });

  const { widgets } = await frame.context({ reset: "fallback" });

  expect(widgets.streak).toMatchObject({ status: "failed" });
});

test("an unavailable adapter stays unavailable through a reset", async () => {
  const { frame } = createStreakFrame({ unavailable: { reason: "No host." } });

  const { widgets } = await frame.context({ reset: "fallback" });

  expect(widgets.streak).toMatchObject({
    status: "unavailable",
    reason: "No host.",
  });
});

test("a reset behind a stuck call is blocked, and says so", async () => {
  const { frame, widget, control, clock } = createStreakFrame(
    {},
    { timeout: 500 },
  );

  control.script({ outcome: "hold" });
  widget.publish(ready(1));
  await settle();
  clock.advance(500);

  const { widgets } = await frame.context({ reset: "fallback" });

  expect(widgets.streak).toMatchObject({ status: "blocked" });
});

test("every context change counts an epoch, even with the same account signing in again", async () => {
  const { frame } = createStreakFrame();

  expect(frame.diagnostics.get().epoch).toBe(1);

  await frame.context({ reset: "preserve" });
  await frame.context({ reset: "preserve" });

  expect(frame.diagnostics.get().epoch).toBe(3);
});

test("a context change after dispose does nothing", async () => {
  const { frame } = createStreakFrame();

  frame.dispose();

  expect(await frame.context({ reset: "fallback" })).toEqual({ widgets: {} });
});

test("a request queued behind a call in flight never reaches the provider after the context ended", async () => {
  const { frame, widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.publish(ready(1));

  await settle();

  const queued = widget.publish(ready(2));

  await settle();

  const next = frame.context({ reset: "preserve" });

  control.held()[0]?.release();
  await Promise.all([first, queued, next]);
  await settle();

  expect(control.calls()).toHaveLength(1);
  expect(await queued).toMatchObject({ status: "expired" });
});

test("a retired handle hears nothing about the Frame after its context, not even its disposal", async () => {
  const { frame, widget } = createStreakFrame();
  const seen: string[] = [];

  widget.status.subscribe(() => seen.push(widget.status.get().lifecycle.state));
  await frame.context({ reset: "preserve" });
  frame.dispose();

  expect(seen).toEqual(["retired"]);
});

test("a handle made by a context change reads the lifecycle of the adapter that is already open, at once", async () => {
  const { frame, widget } = createStreakFrame();

  await widget.publish(ready(1));

  const next = frame.context({ reset: "preserve" });

  expect(frame.widget("streak").status.get().lifecycle).toEqual({
    state: "ready",
  });

  await next;
});
