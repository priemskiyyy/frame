import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { Frame } from "src/utils/Frame";
import {
  createGatedFrame,
  createStreakFrame,
  ready,
  streak,
} from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

test("a request waiting behind a call in flight is superseded by a newer one and never sent", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.publish(ready(1));

  await settle();

  const second = widget.publish(ready(2));
  const third = widget.publish(ready(3));

  expect(await second).toEqual({
    request: { id: "r2" },
    status: "superseded",
    by: { id: "r3" },
  });

  control.held()[0]?.release();

  expect(await first).toMatchObject({ status: "submitted", revision: 1 });
  expect(await third).toMatchObject({ status: "submitted", revision: 3 });
  expect(
    control.calls().map((call) => call.operation === "publish" && call.data),
  ).toEqual([
    { state: "ready", days: 1 },
    { state: "ready", days: 3 },
  ]);
});

test("a call already in flight is never called superseded", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.publish(ready(1));

  await settle();
  widget.publish(ready(2));
  control.held()[0]?.release();

  expect((await first).status).toBe("submitted");
  expect(widget.get()).toEqual({ state: "ready", days: 2 });
});

test("the desired value runs ahead of what the provider has", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.publish(ready(1));

  await settle();
  widget.publish(ready(2));

  expect(widget.get()).toEqual({ state: "ready", days: 2 });
  expect(widget.status.get().work).toBe("submitting");

  control.held()[0]?.release();
  await first;
  await settle();

  expect(widget.status.get().work).toBe("idle");
});

test("calls reach the provider one at a time", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" }, { outcome: "hold" });

  widget.publish(ready(1));
  await settle();
  widget.publish(ready(2));
  await settle();

  expect(control.held()).toHaveLength(1);

  control.held()[0]?.release();
  await settle();

  expect(control.held()).toHaveLength(1);
});

test("a call that outlives the timeout ends indeterminate and blocks the write domain", async () => {
  const { widget, control, clock } = createStreakFrame({}, { timeout: 1_000 });

  control.script({ outcome: "hold" });

  const stuck = widget.publish(ready(1));

  await settle();
  clock.advance(1_000);

  expect(await stuck).toMatchObject({
    status: "indeterminate",
    reason: "timeout",
    error: null,
  });
  expect(widget.status.get().work).toBe("blocked");
  expect(await widget.publish(ready(2))).toMatchObject({ status: "blocked" });
  expect(control.calls()).toHaveLength(1);
});

test("a write domain reopens when the call that outlived its deadline finally answers", async () => {
  const { widget, control, clock } = createStreakFrame({}, { timeout: 1_000 });

  control.script({ outcome: "hold" });

  const stuck = widget.publish(ready(1));

  await settle();
  clock.advance(1_000);
  await stuck;
  control.held()[0]?.release();
  await settle();

  expect(widget.status.get().work).toBe("idle");
  expect((await widget.publish(ready(2))).status).toBe("submitted");
});

test("a timed out call is not remembered as submitted, even if it lands later", async () => {
  const { widget, control, clock } = createStreakFrame({}, { timeout: 1_000 });

  control.script({ outcome: "hold" });

  const stuck = widget.publish(ready(1));

  await settle();
  clock.advance(1_000);
  await stuck;
  control.held()[0]?.release();
  await settle();

  expect((await widget.publish(ready(1))).status).toBe("submitted");
});

test("requests queued before a call is known to be stuck are blocked with it", async () => {
  const { widget, control, clock } = createStreakFrame({}, { timeout: 1_000 });

  control.script({ outcome: "hold" });

  widget.publish(ready(1));
  await settle();

  const queued = widget.publish(ready(2));

  clock.advance(1_000);

  expect(await queued).toMatchObject({ status: "blocked" });
});

test("a call that answers in time cancels its deadline", async () => {
  const { widget, clock } = createStreakFrame();

  await widget.publish(ready(1));
  await settle();

  expect(clock.pending()).toBe(0);
});

test("a request validating asynchronously settles superseded and leaves the widget idle", async () => {
  const { widget, arm, gates } = createGatedFrame();

  arm();

  const older = widget.publish({ n: 1 });
  const newer = widget.publish({ n: 2 });

  gates[1]?.();
  await newer;
  gates[0]?.();

  expect((await older).status).toBe("superseded");
  expect(widget.status.get().work).toBe("idle");
});

test("a request already queued behind a call in flight is taken out of the lane when a newer one supersedes it", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.publish(ready(1));

  await settle();

  const second = widget.publish(ready(2));

  await settle();

  const third = widget.publish(ready(3));

  control.held()[0]?.release();
  await Promise.all([first, second, third]);
  await settle();

  expect(
    control.calls().map((call) => call.operation === "publish" && call.data),
  ).toEqual([ready(1), ready(3)]);
});

test("two widgets that share a write domain share a lane", async () => {
  const other = widget({
    name: "OtherWidget",
    schema: streak.schema,
    fallback: { state: "empty" },
  });

  const first = createMockAdapter(streak, { writeDomain: "shared" });
  const second = createMockAdapter(other, { writeDomain: "shared" });

  const frame = new Frame({
    widgets: { streak, other },
    adapters: [first.adapter, second.adapter],
    clock: createTestClock({ now: 1_000_000 }),
  });

  first.control.script({ outcome: "hold" });

  const held = frame.widget("streak").publish(ready(1));

  await settle();

  const behind = frame.widget("other").publish(ready(2));

  await settle();

  expect(second.control.calls()).toEqual([]);

  first.control.held()[0]?.release();
  await Promise.all([held, behind]);

  expect(second.control.calls()).toHaveLength(1);
});
