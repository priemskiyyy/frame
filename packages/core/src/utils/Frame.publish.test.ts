import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import { createMockAdapter } from "src/mock/createMockAdapter";
import type { JsonRecord } from "src/types/JsonRecord";
import { widget } from "src/utils/widget";
import { Frame } from "src/utils/Frame";
import {
  createGatedFrame,
  createScriptedFrame,
  createStreakFrame,
  ready,
  streak,
} from "src/utils/Frame.fixture";

test("a valid publication is submitted with the revision and simulated evidence", async () => {
  const { widget, control } = createStreakFrame();

  const outcome = await widget.publish(ready(12));

  expect(outcome).toEqual({
    request: { id: "r1" },
    status: "submitted",
    kind: "snapshot",
    revision: 1,
    evidence: "simulated",
  });
  expect(control.calls()).toEqual([
    { operation: "publish", data: { state: "ready", days: 12 } },
  ]);
});

test("the desired value is readable at once when the schema answers synchronously", () => {
  const { widget } = createStreakFrame();

  widget.publish(ready(3));

  expect(widget.get()).toEqual({ state: "ready", days: 3 });
});

test("mutating the data after the call cannot change what was captured", async () => {
  const { widget, control } = createStreakFrame();

  const data: { state: "ready"; days: number; label: string } = {
    state: "ready",
    days: 5,
    label: "five",
  };

  const pending = widget.publish(data);

  data.days = 99;
  data.label = "changed";

  await pending;

  expect(control.calls()).toEqual([
    {
      operation: "publish",
      data: { state: "ready", days: 5, label: "five" },
    },
  ]);
  expect(widget.get()).toEqual({ state: "ready", days: 5, label: "five" });
});

test("an accepted snapshot is deeply frozen", async () => {
  const { widget } = createStreakFrame();

  await widget.publish({ state: "ready", days: 1, label: "x" });

  expect(Object.isFrozen(widget.get())).toBe(true);
});

test("data the schema rejects is invalid, reaches no provider and is not desired", async () => {
  const { widget, control } = createStreakFrame();

  const wrong = { state: "ready", days: "twelve" };

  // @ts-expect-error days must be a number
  const outcome = await widget.publish(wrong);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
  });
  expect(outcome.status === "invalid" && outcome.issues[0]?.path).toBe("days");
  expect(control.calls()).toEqual([]);
  expect(widget.get()).toBeNull();
  expect(control.sessions()).toBe(0);
});

test("a rejected newer request does not erase a valid older one", async () => {
  const { widget } = createStreakFrame();

  await widget.publish(ready(4));
  await widget.publish({ state: "ready", days: -1.5 });

  expect(widget.get()).toEqual({ state: "ready", days: 4 });
  expect(widget.status.get().desired).toEqual({
    state: "accepted",
    origin: "publication",
    revision: 1,
  });
});

test("a value that is not plain data is invalid, never an exception", async () => {
  const { widget } = createStreakFrame();

  const withDate: { state: "ready"; days: number; at: Date } = {
    state: "ready",
    days: 1,
    at: new Date(0),
  };

  const outcome = await widget.publish(withDate);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
  });
});

test("a schema that strips a key changes the value, so the publication is invalid", async () => {
  const { widget, control } = createStreakFrame();

  const withExtra: { state: "ready"; days: number; extra: boolean } = {
    state: "ready",
    days: 1,
    extra: true,
  };

  const outcome = await widget.publish(withExtra);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "changed-value",
    issues: [{ path: "extra" }],
  });
  expect(control.calls()).toEqual([]);
});

test("a schema that throws makes the publication invalid", async () => {
  const widgetDefinition = widget({
    name: "ThrowingWidget",
    schema: {
      "~standard": {
        version: 1,
        vendor: "throwing",
        validate: (value) => {
          if (Object.hasOwn(value, "boom")) {
            throw new Error("boom");
          }

          return { value };
        },
      },
    },
    fallback: {} satisfies JsonRecord,
  });

  const { adapter } = createMockAdapter(widgetDefinition);

  const frame = new Frame({
    widgets: { throwing: widgetDefinition },
    adapters: [adapter],
  });

  const outcome = await frame.widget("throwing").publish({ boom: true });

  expect(outcome).toMatchObject({ status: "invalid", reason: "schema-threw" });
});

test("a slow older validation that finishes after a newer request is superseded", async () => {
  const { widget, control, arm, gates } = createGatedFrame();

  arm();

  const older = widget.publish({ n: 1 });
  const newer = widget.publish({ n: 2 });

  expect(widget.status.get().work).toBe("validating");

  gates[1]?.();
  await settle();
  gates[0]?.();

  expect(await newer).toMatchObject({ status: "submitted", revision: 1 });
  expect(await older).toEqual({
    request: { id: "r1" },
    status: "superseded",
    by: { id: "r2" },
  });
  expect(control.calls()).toEqual([{ operation: "publish", data: { n: 2 } }]);
  expect(widget.get()).toEqual({ n: 2 });
});

test("a newer invalid request does not supersede an older valid one", async () => {
  const { widget, arm, gates } = createGatedFrame();

  arm();

  const older = widget.publish({ n: 1 });
  // @ts-expect-error a function is not display data
  const newer = widget.publish({ n: () => 1 });

  gates[0]?.();

  expect(await newer).toMatchObject({ status: "invalid" });
  expect(await older).toMatchObject({ status: "submitted" });
});

test("equal content is unchanged after a submission, and force sends it again", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(7));

  const again = await widget.publish(ready(7));
  const forced = await widget.publish(ready(7), { force: true });

  expect(again).toMatchObject({ status: "unchanged", revision: 2 });
  expect(forced).toMatchObject({ status: "submitted", revision: 3 });
  expect(control.calls()).toHaveLength(2);
});

test("key order does not make content different", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish({ state: "ready", days: 1, label: "a" });

  const again = await widget.publish({ label: "a", days: 1, state: "ready" });

  expect(again.status).toBe("unchanged");
  expect(control.calls()).toHaveLength(1);
});

test("content is never deduplicated against a failed submission", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "fail" });

  const first = await widget.publish(ready(2));
  const second = await widget.publish(ready(2));

  expect(first.status).toBe("failed");
  expect(second.status).toBe("submitted");
  expect(control.calls()).toHaveLength(2);
});

test("content is never deduplicated against an indeterminate submission", async () => {
  const { widget, control } = createStreakFrame();

  control.script({ outcome: "indeterminate", stored: true });

  const first = await widget.publish(ready(2));
  const second = await widget.publish(ready(2));

  expect(first).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
  });
  expect(second.status).toBe("submitted");
});

test("a call that throws is indeterminate and keeps the error", async () => {
  const { widget, control } = createStreakFrame();
  const error = new Error("native crash");

  control.script({ outcome: "throw", error });

  expect(await widget.publish(ready(1))).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error,
  });
});

test("an adapter answer outside its contract is indeterminate and names INVALID_ANSWER", async () => {
  const { adapter } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: async () => {
          const opening = await adapter.open();

          if (opening.status !== "opened") {
            return opening;
          }

          return {
            status: "opened",
            session: {
              ...opening.session,
              publish: () => JSON.parse('{ "status": "weird" }'),
            },
          };
        },
      },
    ],
  });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error: expect.objectContaining({ code: "INVALID_ANSWER" }),
  });
});

test("an adapter answer of skipped is reported, and is not remembered as submitted", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(1));
  control.script({ outcome: "skip" });

  expect(await widget.publish(ready(2))).toMatchObject({
    status: "skipped",
    reason: "no-placements",
  });

  expect((await widget.publish(ready(1))).status).toBe("submitted");
});

test("publish never rejects, even for a value no type allows", async () => {
  const { widget } = createStreakFrame();

  // @ts-expect-error null is not display data
  const outcome = await widget.publish(null);

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
    issues: [{ path: "" }],
  });
});

test("a request settles once, and later requests get their own ids", async () => {
  const { widget } = createStreakFrame();

  const first = await widget.publish(ready(1));
  const second = await widget.publish(ready(2));

  expect([first.request.id, second.request.id]).toEqual(["r1", "r2"]);
});

test("content last submitted is sent again after a later indeterminate write of other content", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(1));
  control.script({ outcome: "throw", error: new Error("x"), stored: true });
  await widget.publish(ready(2));

  expect(await widget.publish(ready(1))).toMatchObject({ status: "submitted" });
});

test("a forced publication that is superseded by equal content keeps its force", async () => {
  const { widget, control } = createStreakFrame();

  await widget.publish(ready(1));
  control.script({ outcome: "hold" });

  const reload = widget.reload();

  await settle();

  const forced = widget.publish(ready(1), { force: true });
  const routine = widget.publish(ready(1));

  control.held()[0]?.release();
  await Promise.all([reload, forced, routine]);

  expect((await forced).status).toBe("superseded");
  expect((await routine).status).toBe("submitted");
  expect(
    control.calls().filter((call) => call.operation === "publish"),
  ).toHaveLength(2);
});

test("one array referenced twice is not a cycle", async () => {
  const { widget: handle } = createGatedFrame();
  const shared = [1];

  expect(await handle.publish({ a: shared, b: shared })).toMatchObject({
    status: "submitted",
  });
});

test("a schema issue at the root names an empty path", async () => {
  const { widget: handle, control } = createScriptedFrame(() => ({
    issues: [{ message: "No." }],
  }));

  const outcome = await handle.publish({ n: 1 });

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
    issues: [{ path: "", message: "No." }],
  });
  expect(control.calls()).toEqual([]);
});

test("a nested schema issue names its path", async () => {
  const { widget: handle } = createStreakFrame();

  const outcome = await handle.publish(
    JSON.parse('{ "state": "ready", "days": -1 }'),
  );

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
    issues: [{ path: "days" }],
  });
});

test("a call that outlives the default timeout of five seconds ends indeterminate", async () => {
  const { widget: handle, control, clock } = createStreakFrame();

  control.script({ outcome: "hold" });

  const stuck = handle.publish(ready(1));

  await settle();
  clock.advance(4_999);
  await settle();

  expect(handle.status.get().work).toBe("submitting");

  clock.advance(1);

  expect(await stuck).toMatchObject({
    status: "indeterminate",
    reason: "timeout",
    error: null,
  });
});

test("an adapter that answers nothing at all is indeterminate and names INVALID_ANSWER", async () => {
  const { adapter } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => ({
          status: "opened",
          session: {
            writeDomain: "forgetful",
            // @ts-expect-error returning nothing is outside the contract
            publish: () => undefined,
          },
        }),
      },
    ],
  });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error: expect.objectContaining({ code: "INVALID_ANSWER" }),
  });
});

test("when every adapter refuses and none offers a remedy, the answer has none", async () => {
  const first = createMockAdapter(streak, { unavailable: { reason: "A." } });
  const second = createMockAdapter(streak, { unavailable: { reason: "B." } });

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      { ...first.adapter, name: "one" },
      { ...second.adapter, name: "two" },
    ],
  });

  expect(await frame.widget("streak").publish(ready(1))).toEqual({
    request: { id: "r1" },
    status: "unavailable",
    reason: "one: A. two: B.",
    remediation: null,
  });
});
