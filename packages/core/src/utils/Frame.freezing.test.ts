import { expect, test } from "vitest";
import type { FrameDiagnosticEvent } from "src/types/FrameDiagnosticEvent";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { Frame } from "src/utils/Frame";
import { createStreakFrame, ready, streak } from "src/utils/Frame.fixture";

test("an outcome is frozen", async () => {
  const { widget } = createStreakFrame();

  expect(Object.isFrozen(await widget.publish(ready(1)))).toBe(true);
});

test("an invalid outcome and its issues are frozen", async () => {
  const { widget } = createStreakFrame();

  const outcome = await widget.publish(
    JSON.parse('{ "state": "ready", "days": -1 }'),
  );

  expect(Object.isFrozen(outcome)).toBe(true);
  expect(outcome.status === "invalid" && Object.isFrozen(outcome.issues)).toBe(
    true,
  );
  expect(
    outcome.status === "invalid" && Object.isFrozen(outcome.issues[0]),
  ).toBe(true);
});

test("the status, its lifecycle, its desired value and its last outcome are frozen", async () => {
  const { widget } = createStreakFrame();

  await widget.publish(ready(1));

  const status = widget.status.get();

  expect(Object.isFrozen(status)).toBe(true);
  expect(Object.isFrozen(status.lifecycle)).toBe(true);
  expect(Object.isFrozen(status.desired)).toBe(true);
  expect(Object.isFrozen(status.latest)).toBe(true);
});

test("a caller that tries to change a lifecycle cannot change what other handles read", async () => {
  const first = createStreakFrame();
  const second = createStreakFrame();

  await first.widget.publish(ready(1));
  await second.widget.publish(ready(1));

  expect(() => {
    const { lifecycle } = first.widget.status.get();

    Object.assign(lifecycle, { state: "failed" });
  }).toThrowError();
  expect(second.widget.status.get().lifecycle).toEqual({ state: "ready" });
});

test("the idle status of a handle that has done nothing is frozen too", () => {
  const { widget } = createStreakFrame();
  const status = widget.status.get();

  expect(Object.isFrozen(status)).toBe(true);
  expect(Object.isFrozen(status.lifecycle)).toBe(true);
  expect(Object.isFrozen(status.desired)).toBe(true);
});

test("the diagnostics snapshot and its widget summaries are frozen", () => {
  const { frame } = createStreakFrame();
  const snapshot = frame.diagnostics.get();

  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.widgets)).toBe(true);
  expect(Object.isFrozen(snapshot.widgets.streak)).toBe(true);
});

test("a diagnostics event is frozen with its nested names", async () => {
  const { frame, widget } = createStreakFrame();
  const events: FrameDiagnosticEvent[] = [];

  frame.diagnostics.events.subscribe((event) => events.push(event));
  await widget.publish(ready(1));

  const nested = events.flatMap((event) => {
    if (event.type === "request-settled") {
      return [event.widget, event.request, event.outcome];
    }

    if (event.type === "request-accepted") {
      return [event.widget, event.request];
    }

    if ("widget" in event) {
      return [event.widget];
    }

    return [];
  });

  expect(events.map(({ type }) => type)).toEqual([
    "request-accepted",
    "widget-preparing",
    "widget-ready",
    "request-settled",
  ]);
  expect(events.every((event) => Object.isFrozen(event))).toBe(true);
  expect(nested).toHaveLength(7);
  expect(nested.every((value) => Object.isFrozen(value))).toBe(true);
});

test("the handle, its status and the diagnostics view cannot be replaced", () => {
  const { frame, widget } = createStreakFrame();

  expect(Object.isFrozen(widget)).toBe(true);
  expect(Object.isFrozen(widget.status)).toBe(true);
  expect(Object.isFrozen(frame.diagnostics)).toBe(true);
  expect(Object.isFrozen(frame.diagnostics.events)).toBe(true);
});

test("the prepare report and its widgets are frozen", async () => {
  const { frame } = createStreakFrame();
  const report = await frame.prepare();

  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.widgets)).toBe(true);
});

test("a failed and an unavailable lifecycle are frozen, and so is the one of a widget with no adapter", async () => {
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

  const unavailable = createStreakFrame({ unavailable: { reason: "No." } });
  const bare = new Frame({ widgets: { streak } });

  await failing.widget("streak").publish(ready(1));
  await unavailable.widget.publish(ready(1));

  expect(failing.widget("streak").status.get().lifecycle).toMatchObject({
    state: "failed",
  });
  expect(Object.isFrozen(failing.widget("streak").status.get().lifecycle)).toBe(
    true,
  );
  expect(unavailable.widget.status.get().lifecycle).toMatchObject({
    state: "unavailable",
  });
  expect(Object.isFrozen(unavailable.widget.status.get().lifecycle)).toBe(true);
  expect(bare.widget("streak").status.get().lifecycle).toMatchObject({
    state: "unavailable",
  });
  expect(Object.isFrozen(bare.widget("streak").status.get().lifecycle)).toBe(
    true,
  );
});

test("a readback outcome and its entries are frozen", async () => {
  const { widget, control } = createStreakFrame();

  control.seed([{ at: 1, data: ready(1) }]);

  const outcome = await widget.readback();

  expect(Object.isFrozen(outcome)).toBe(true);
  expect(outcome.status === "read" && Object.isFrozen(outcome.entries)).toBe(
    true,
  );
  expect(outcome.status === "read" && Object.isFrozen(outcome.entries[0])).toBe(
    true,
  );
});

test("a definition widget() did not make is not shared with the caller", async () => {
  const fallback: { state: "empty" } = { state: "empty" };
  const forged = { name: "ForgedWidget", schema: streak.schema, fallback };

  const { adapter } = createMockAdapter(forged);

  const frame = new Frame({
    widgets: { forged },
    adapters: [adapter],
    clock: createTestClock(),
  });

  await frame.widget("forged").reset();

  expect(Object.isFrozen(frame.widget("forged").get())).toBe(true);
  expect(frame.widget("forged").get()).not.toBe(fallback);
});
