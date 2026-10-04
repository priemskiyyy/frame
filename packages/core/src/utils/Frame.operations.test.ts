import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import {
  createGatedFrame,
  createScriptedFrame,
  createStreakFrame,
  ready,
} from "src/utils/Frame.fixture";

const NOW = 1_000_000;

test("a timeline replaces the schedule, and the entry that is current is what is desired", async () => {
  const { widget, control } = createStreakFrame();

  const outcome = await widget.publishTimeline([
    { at: NOW - 10, data: ready(1) },
    { at: NOW + 60_000, data: ready(2) },
  ]);

  expect(outcome).toMatchObject({
    status: "submitted",
    kind: "timeline",
    revision: 1,
  });
  expect(widget.get()).toEqual({ state: "ready", days: 1 });
  expect(control.stored()).toEqual([
    { at: NOW - 10, data: { state: "ready", days: 1 } },
    { at: NOW + 60_000, data: { state: "ready", days: 2 } },
  ]);
});

test("a timeline needs entries", async () => {
  const { widget, control } = createStreakFrame();

  expect(await widget.publishTimeline([])).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
  expect(control.calls()).toEqual([]);
});

test("timeline instants must be strictly increasing safe integers", async () => {
  const { widget } = createStreakFrame();

  const unsorted = await widget.publishTimeline([
    { at: NOW, data: ready(1) },
    { at: NOW - 1, data: ready(2) },
  ]);

  const duplicated = await widget.publishTimeline([
    { at: NOW, data: ready(1) },
    { at: NOW, data: ready(2) },
  ]);

  const fractional = await widget.publishTimeline([
    { at: NOW + 0.5, data: ready(1) },
  ]);

  expect(unsorted).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
  expect(duplicated).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
  expect(fractional).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
  expect(unsorted.status === "invalid" && unsorted.issues[0]?.path).toBe(
    "entries[1].at",
  );
});

test("a timeline whose first entry is still in the future would show nothing yet, so it is refused", async () => {
  const { widget } = createStreakFrame();

  expect(
    await widget.publishTimeline([{ at: NOW + 1, data: ready(1) }]),
  ).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
});

test("a timeline longer than the limit is refused", async () => {
  const { widget } = createStreakFrame({}, { limits: { entries: 2 } });

  const outcome = await widget.publishTimeline([
    { at: NOW - 3, data: ready(1) },
    { at: NOW - 2, data: ready(2) },
    { at: NOW - 1, data: ready(3) },
  ]);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "limit-exceeded",
  });
});

test("one invalid entry refuses the whole timeline, and says which", async () => {
  const { widget, control } = createStreakFrame();

  const outcome = await widget.publishTimeline([
    { at: NOW - 2, data: ready(1) },
    { at: NOW - 1, data: { state: "ready", days: -5 } },
  ]);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
  });
  expect(outcome.status === "invalid" && outcome.issues[0]?.path).toBe(
    "entries[1].data.days",
  );
  expect(control.calls()).toEqual([]);
  expect(widget.get()).toBeNull();
});

test("a timeline entry that is not plain data is refused with its path", async () => {
  const { widget } = createStreakFrame();

  const bad: { state: "ready"; days: number; at: Date } = {
    state: "ready",
    days: 1,
    at: new Date(0),
  };

  const outcome = await widget.publishTimeline([{ at: NOW, data: bad }]);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
  });
  expect(outcome.status === "invalid" && outcome.issues[0]?.path).toBe(
    "entries[0].data.at",
  );
});

test("timeline entries are validated with an asynchronous schema too", async () => {
  const { widget, control, arm, gates } = createGatedFrame();

  arm();

  const outcome = widget.publishTimeline([
    { at: 0, data: { n: 1 } },
    { at: 1, data: { n: 2 } },
  ]);

  gates[1]?.();
  gates[0]?.();

  expect(await outcome).toMatchObject({
    status: "submitted",
    kind: "timeline",
  });
  expect(control.stored()).toHaveLength(2);
});

test("a publication after a timeline replaces the whole schedule with one snapshot", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publishTimeline([{ at: NOW, data: ready(1) }]);
  await widget.publish(ready(2));

  expect(control.stored()).toEqual([
    { at: 0, data: { state: "ready", days: 2 } },
  ]);
  expect(control.calls().map((call) => call.operation)).toEqual([
    "publishTimeline",
    "publish",
  ]);
});

test("an identical timeline is unchanged, and is never mistaken for a snapshot", async () => {
  const { widget, control } = createStreakFrame();
  const entries = [{ at: NOW, data: ready(1) }];

  await widget.publishTimeline(entries);

  expect((await widget.publishTimeline(entries)).status).toBe("unchanged");
  expect((await widget.publish(ready(1))).status).toBe("submitted");
  expect(control.calls()).toHaveLength(2);
});

test("a timeline waiting behind a call in flight is superseded by a newer publication", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.publish(ready(1));

  await settle();

  const schedule = widget.publishTimeline([{ at: NOW, data: ready(2) }]);
  const newest = widget.publish(ready(3));

  expect(await schedule).toMatchObject({ status: "superseded" });

  control.held()[0]?.release();
  await first;

  expect((await newest).status).toBe("submitted");
});

test("a reload request reaches the provider, and is answered with its evidence", async () => {
  const { widget, control } = createStreakFrame();

  expect(await widget.reload()).toEqual({
    request: { id: "r1" },
    status: "submitted",
    evidence: "simulated",
  });
  expect(control.calls()).toEqual([{ operation: "reload" }]);
});

test("a reload is never deduplicated and never superseded", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const first = widget.reload();

  await settle();

  const second = widget.reload();

  control.held()[0]?.release();

  expect((await first).status).toBe("submitted");
  expect((await second).status).toBe("submitted");
  expect(control.calls()).toHaveLength(2);
});

test("a reload waits behind a write in flight, so it reloads what was written", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const write = widget.publish(ready(1));

  await settle();

  const reload = widget.reload();

  await settle();

  expect(control.calls().map((call) => call.operation)).toEqual(["publish"]);

  control.held()[0]?.release();
  await write;
  await reload;

  expect(control.calls().map((call) => call.operation)).toEqual([
    "publish",
    "reload",
  ]);
});

test("a reload that fails reports the failure and leaves the content alone", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(1));

  const error = new Error("no reload");

  control.script({ outcome: "throw", error });
  expect(await widget.reload()).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error,
  });
  expect(widget.get()).toEqual({ state: "ready", days: 1 });
});

test("a readback returns what the schema accepts, and counts what it does not", async () => {
  const { widget, control } = createStreakFrame();

  control.seed([
    { at: 1, data: { state: "ready", days: 3 } },
    { at: 2, data: { state: "ready", days: "old build" } },
    { at: 3, data: { state: "empty" } },
  ]);

  expect(await widget.readback()).toEqual({
    request: { id: "r1" },
    status: "read",
    entries: [
      { at: 1, data: { state: "ready", days: 3 } },
      { at: 3, data: { state: "empty" } },
    ],
    rejected: 1,
  });
});

test("a readback reads what a publication stored, after it", async () => {
  const { widget } = createStreakFrame();

  await widget.publish(ready(8));

  const outcome = await widget.readback();

  expect(outcome).toMatchObject({
    status: "read",
    entries: [{ data: { state: "ready", days: 8 } }],
    rejected: 0,
  });
});

test("a readback with a stored value that is not plain data rejects it instead of casting it", async () => {
  const { widget, control } = createStreakFrame();

  control.seed([
    {
      at: 1,
      data: Object.assign(Object.create({ inherited: true }), {
        state: "empty",
      }),
    },
  ]);

  expect(await widget.readback()).toMatchObject({
    status: "read",
    entries: [],
    rejected: 1,
  });
});

test("a readback that fails is reported", async () => {
  const { widget, control } = createStreakFrame();
  const error = new Error("no storage");

  control.script({ outcome: "fail", error });

  expect(await widget.readback()).toMatchObject({
    status: "failed",
    error,
  });
});

test("operations on a retired or disposed handle answer expired or disposed", async () => {
  const { frame, widget } = createStreakFrame();

  await frame.context({ reset: "preserve" });

  expect(await widget.reload()).toMatchObject({ status: "expired" });
  expect(await widget.readback()).toMatchObject({ status: "expired" });
  expect(
    await widget.publishTimeline([{ at: NOW, data: ready(1) }]),
  ).toMatchObject({ status: "expired" });

  frame.dispose();

  expect(await frame.widget("streak").reload()).toMatchObject({
    status: "disposed",
  });
});

test("a reload and a readback queued behind a write are dropped when the context ends", async () => {
  const { frame, widget, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const write = widget.publish(ready(1));

  await settle();

  const reload = widget.reload();
  const read = widget.readback();

  await frame.context({ reset: "preserve" });
  control.held()[0]?.release();
  await write;
  await settle();

  expect(await reload).toMatchObject({ status: "expired" });
  expect(await read).toMatchObject({ status: "expired" });
  expect(control.calls().map((call) => call.operation)).toEqual(["publish"]);
});

test("a reload waiting for its adapter to open is dropped when the context ends", async () => {
  const { frame, widget, control } = createStreakFrame();

  const reload = widget.reload();

  await frame.context({ reset: "preserve" });

  expect(await reload).toMatchObject({ status: "expired" });
  expect(control.calls()).toEqual([]);
});

test("when several entries of a timeline are already past, the widget shows the latest of them", async () => {
  const { widget } = createStreakFrame();

  await widget.publishTimeline([
    { at: NOW - 1000, data: ready(1) },
    { at: NOW - 500, data: ready(2) },
    { at: NOW + 500, data: ready(3) },
  ]);

  expect(widget.get()).toEqual(ready(2));
});

test("timelines with equal data at different instants are different content", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publishTimeline([{ at: NOW - 10, data: ready(1) }]);

  const second = await widget.publishTimeline([
    { at: NOW - 20, data: ready(1) },
  ]);

  expect(second.status).toBe("submitted");
  expect(control.stored()[0]?.at).toBe(NOW - 20);
});

test("an instant a Date cannot hold is invalid", async () => {
  const { widget } = createStreakFrame();

  expect(
    await widget.publishTimeline([
      { at: NOW - 1, data: ready(1) },
      { at: 8_640_000_000_000_001, data: ready(2) },
    ]),
  ).toMatchObject({ status: "invalid", reason: "invalid-timeline" });
});

test("a timeline whose entries together are larger than the byte limit is invalid, though each one fits", async () => {
  const { widget } = createStreakFrame({}, { limits: { bytes: 200 } });

  const entries = Array.from({ length: 10 }, (_, index) => ({
    at: NOW - 100 + index,
    data: ready(index, "x".repeat(20)),
  }));

  expect(await widget.publishTimeline(entries)).toMatchObject({
    status: "invalid",
    reason: "limit-exceeded",
  });
});

test("a readback entry whose instant is not a safe integer is counted rejected", async () => {
  const { widget, control } = createStreakFrame();

  control.seed([
    { at: 1.5, data: ready(1) },
    { at: 2, data: ready(2) },
  ]);

  expect(await widget.readback()).toMatchObject({
    status: "read",
    entries: [{ at: 2, data: ready(2) }],
    rejected: 1,
  });
});

test("a timeline's entries are frozen when the adapter receives them, and the current entry is available at once", async () => {
  const { widget, control } = createStreakFrame();

  const done = widget.publishTimeline([
    { at: NOW - 1, data: ready(1) },
    { at: NOW + 1, data: ready(2) },
  ]);

  expect(widget.get()).toEqual(ready(1));
  await done;

  const [call] = control.calls();

  expect(call?.operation).toBe("publishTimeline");
  expect(call?.operation === "publishTimeline" && call.entries).toHaveLength(2);
  expect(
    call?.operation === "publishTimeline" && Object.isFrozen(call.entries),
  ).toBe(true);
  expect(
    call?.operation === "publishTimeline" &&
      call.entries.map((entry) => Object.isFrozen(entry)),
  ).toEqual([true, true]);
});

test("a timeline entry the schema rejects at its root names the entry's data", async () => {
  const { widget, control } = createScriptedFrame(() => ({
    issues: [{ message: "No." }],
  }));

  const outcome = await widget.publishTimeline([{ at: NOW, data: { n: 1 } }]);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
    issues: [{ path: "entries[0].data", message: "No." }],
  });
  expect(control.calls()).toEqual([]);
});

test("a timeline entry that is not a record names the entry's data", async () => {
  const { widget } = createStreakFrame();

  // @ts-expect-error null is not display data
  const outcome = await widget.publishTimeline([{ at: NOW, data: null }]);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
    issues: [{ path: "entries[0].data" }],
  });
});

test("a timeline entry the schema rejects below its root names the field after the entry's data", async () => {
  const { widget } = createStreakFrame();

  const outcome = await widget.publishTimeline([
    { at: NOW, data: JSON.parse('{ "state": "nope" }') },
  ]);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
    issues: [{ path: "entries[0].data.state" }],
  });
});

test("a timeline holds as many entries as the default limit of 64, and no more", async () => {
  const { widget } = createStreakFrame();

  const timeline = (length: number) =>
    Array.from({ length }, (_, index) => ({
      at: NOW - 100 + index,
      data: ready(index),
    }));

  expect((await widget.publishTimeline(timeline(64))).status).toBe("submitted");
  expect(await widget.publishTimeline(timeline(65))).toMatchObject({
    status: "invalid",
    reason: "limit-exceeded",
    issues: [
      { path: "entries", message: "A timeline has at most 64 entries." },
    ],
  });
});
