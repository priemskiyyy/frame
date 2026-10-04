import { expect, test } from "vitest";
import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import { Frame } from "src/utils/Frame";
import {
  createGatedSchema,
  createStreakFrame,
  ready,
  streak,
} from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

const numbered = z.object({ n: z.number() });

const first = widget({
  name: "FirstWidget",
  schema: numbered,
  fallback: { n: 0 },
});

const second = widget({
  name: "SecondWidget",
  schema: numbered,
  fallback: { n: 0 },
});

const createHungOpen = (clock: ReturnType<typeof createTestClock>) => {
  const opens: string[] = [];

  const adapter = {
    name: "hung",
    definition: streak,
    open: () => {
      opens.push("open");

      return new Promise<never>(() => {});
    },
  };

  return {
    opens,
    frame: new Frame({
      widgets: { streak },
      adapters: [adapter],
      clock,
      timeout: 500,
    }),
  };
};

const createReentrant = () => {
  const { schema, arm } = createGatedSchema();
  const hooks = { onValidate: () => {} };

  const reentering: typeof schema = {
    "~standard": {
      version: 1,
      vendor: "reentering",
      validate: (value) => {
        hooks.onValidate();

        return schema["~standard"].validate(value);
      },
    },
  };

  const reentrant = widget({
    name: "GatedWidget",
    schema: reentering,
    fallback: {},
  });

  const { adapter } = createMockAdapter(reentrant);
  const clock = createTestClock();

  const frame = new Frame({
    widgets: { gated: reentrant },
    adapters: [adapter],
    clock,
  });

  arm();

  return { frame, clock, hooks };
};

const createSlowReadback = () => {
  let slow = false;
  const releases: (() => void)[] = [];

  const schema: StandardSchema<JsonRecord, JsonRecord> = {
    "~standard": {
      version: 1,
      vendor: "slow",
      validate: (value) => {
        if (!slow || value.slow !== 1) {
          return { value };
        }

        return new Promise((resolve) => {
          releases.push(() => resolve({ value }));
        });
      },
    },
  };

  const slowWidget = widget({ name: "SlowWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(slowWidget);
  const clock = createTestClock();

  const frame = new Frame({
    widgets: { slowWidget },
    adapters: [adapter],
    clock,
    timeout: 500,
  });

  const handle = frame.widget("slowWidget");

  return {
    frame,
    handle,
    control,
    clock,
    releases,
    seedSlow: async () => {
      await handle.publish({ ok: 1 });
      control.seed([{ at: 1, data: { slow: 1 } }]);
      slow = true;
    },
  };
};

const getOutcomeOrPending = (pending: Promise<{ status: string }>) =>
  Promise.race([
    pending.then(({ status }) => status),
    settle().then(() => "pending"),
  ]);

test("a context started by a diagnostics subscriber while another is being made leaves no live handle", async () => {
  const firstMock = createMockAdapter(first);
  const secondMock = createMockAdapter(second);

  const frame = new Frame({
    widgets: { first, second },
    adapters: [firstMock.adapter, secondMock.adapter],
    clock: createTestClock(),
  });

  await frame.widget("first").publish({ n: 1 });
  await frame.widget("second").publish({ n: 1 });

  let nested = false;
  const taken: ReturnType<typeof frame.widget<"second">>[] = [];

  frame.diagnostics.subscribe(() => {
    if (nested) {
      return;
    }

    nested = true;
    frame.context({ reset: "preserve" });
    taken.push(frame.widget("second"));
  });

  await frame.context({ reset: "preserve" });
  await frame.context({ reset: "preserve" });

  const [handle] = taken;

  expect(handle?.status.get().lifecycle.state).toBe("retired");
  expect((await handle?.publish({ n: 99 }))?.status).toBe("expired");
  expect(
    secondMock.control
      .calls()
      .filter((call) => call.operation === "publish" && call.data.n === 99),
  ).toEqual([]);
});

test("a diagnostics subscriber heard while a context is made finds every widget", async () => {
  const frame = new Frame({
    widgets: { first, second },
    clock: createTestClock(),
  });

  const errors: string[] = [];

  frame.diagnostics.subscribe(() => {
    try {
      frame.widget("first");
      frame.widget("second");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "threw");
    }
  });

  await frame.context();

  expect(errors).toEqual([]);
});

test("a context started by a retirement listener does not receive the outer call's fallback reset", async () => {
  const { frame, widget: old, control } = createStreakFrame();

  await old.publish(ready(1));

  let fired = false;

  old.status.subscribe(() => {
    if (fired || old.status.get().lifecycle.state !== "retired") {
      return;
    }

    fired = true;
    frame.context({ reset: "preserve" });
  });

  const report = await frame.context({ reset: "fallback" });

  await settle();

  expect(report.widgets.streak?.status).toBe("expired");
  expect(
    control.calls().filter((call) => call.operation === "publish"),
  ).toHaveLength(1);
});

test("a publish by a retirement listener into the new context is not undone by the context's own reset", async () => {
  const { frame, widget: old } = createStreakFrame();

  await old.publish(ready(1));

  let fired = false;

  old.status.subscribe(() => {
    if (fired || old.status.get().lifecycle.state !== "retired") {
      return;
    }

    fired = true;
    frame.widget("streak").publish(ready(5));
  });

  await frame.context({ reset: "fallback" });
  await settle();

  expect(frame.widget("streak").get()).toEqual(ready(5));
});

test("concurrent asks to open one widget open its adapter once, and dispose releases every session", async () => {
  const { frame, widget: handle, control } = createStreakFrame();
  let asked = false;
  let again: ReturnType<typeof frame.prepare> | null = null;

  handle.status.subscribe(() => {
    if (asked || handle.status.get().lifecycle.state !== "preparing") {
      return;
    }

    asked = true;
    again = frame.prepare();
  });

  await Promise.all([frame.prepare(), again]);

  expect(control.sessions()).toBe(1);

  frame.dispose();
  await settle();

  expect(control.sessions()).toBe(0);
});

test("disposing while an adapter is still opening settles prepare and leaves no timer", async () => {
  const clock = createTestClock();
  const { frame } = createHungOpen(clock);
  const preparing = frame.prepare();

  await settle();
  frame.dispose();
  await settle();

  expect(
    await Promise.race([preparing, settle().then(() => "pending")]),
  ).not.toBe("pending");
  expect(clock.pending()).toBe(0);
});

test("disposing in the preparing notice never calls the adapter's open", async () => {
  const clock = createTestClock();
  const { frame, opens } = createHungOpen(clock);

  frame.diagnostics.events.subscribe((event) => {
    if (event.type !== "widget-preparing") {
      return;
    }

    frame.dispose();
  });

  const preparing = frame.prepare();

  await settle();

  expect(opens).toEqual([]);
  expect(
    await Promise.race([preparing, settle().then(() => "pending")]),
  ).not.toBe("pending");
  expect(clock.pending()).toBe(0);
});

test("a Frame disposed while it announces a ready widget reports that widget disposed", async () => {
  const { frame, widget: handle } = createStreakFrame();

  handle.status.subscribe(() => {
    if (handle.status.get().lifecycle.state !== "ready") {
      return;
    }

    frame.dispose();
  });

  const report = await frame.prepare();

  expect(report.widgets.streak.status).toBe("disposed");
});

test("a snapshot read inside an event listener agrees with the status it reports on", async () => {
  const { frame, widget: handle } = createStreakFrame();

  frame.diagnostics.get();

  const stale: string[] = [];

  frame.diagnostics.events.subscribe((event) => {
    const status = handle.status.get();
    const summary = frame.diagnostics.get().widgets.streak;

    const agrees =
      summary.work === status.work &&
      summary.latest === (status.latest?.status ?? null);

    if (agrees) {
      return;
    }

    stale.push(`${event.type}: ${status.work} against ${summary.work}`);
  });

  await handle.publish(ready(1));
  await settle();

  expect(stale).toEqual([]);
});

test("a listener that hears a request accepted reads that request as the desired one, even when it took another's place", async () => {
  const { frame, widget: handle, control } = createStreakFrame();
  const disagreements: string[] = [];

  control.script({ outcome: "hold" });
  handle.publish(ready(1));
  await settle();
  handle.publish(ready(2));
  frame.diagnostics.events.subscribe((event) => {
    if (event.type !== "request-accepted") {
      return;
    }

    const { desired } = handle.status.get();

    if (desired.state === "accepted" && desired.revision === event.revision) {
      return;
    }

    disagreements.push(
      `revision ${event.revision}: ${JSON.stringify(desired)}`,
    );
  });
  handle.publish(ready(3));
  control.held()[0]?.release();
  await settle();

  expect(disagreements).toEqual([]);
});

test("a forced request superseded while it is still validated passes its force on", async () => {
  const { schema, arm, gates } = createGatedSchema();
  const gated = widget({ name: "GatedWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(gated);

  const frame = new Frame({
    widgets: { gated },
    adapters: [adapter],
    clock: createTestClock(),
  });

  const handle = frame.widget("gated");

  await handle.publish({ a: 1 });
  arm();

  const forced = handle.publish({ a: 1 }, { force: true });
  const routine = handle.publish({ a: 1 });

  gates[1]?.();
  await settle();
  gates[0]?.();
  await settle();

  expect((await forced).status).toBe("superseded");
  expect((await routine).status).toBe("submitted");
  expect(
    control.calls().filter((call) => call.operation === "publish"),
  ).toHaveLength(2);
});

test("a schema that never answers ends its request by the deadline, and work returns to idle", async () => {
  const { schema, arm, gates } = createGatedSchema();
  const gated = widget({ name: "GatedWidget", schema, fallback: {} });
  const { adapter } = createMockAdapter(gated);
  const clock = createTestClock();

  const frame = new Frame({
    widgets: { gated },
    adapters: [adapter],
    clock,
    timeout: 500,
  });

  const handle = frame.widget("gated");

  arm();

  const stuck = handle.publish({ a: 1 });
  const newer = handle.publish({ a: 2 });

  gates[1]?.();
  await settle();

  expect((await newer).status).toBe("submitted");

  clock.advance(1_000_000);
  await settle();

  expect(await getOutcomeOrPending(stuck)).toBe("invalid");
  expect(handle.status.get().work).toBe("idle");
});

test("a schema that has not answered when the deadline passes ends its request invalid, and what it answers later publishes nothing", async () => {
  const { schema, arm, gates } = createGatedSchema();
  const gated = widget({ name: "GatedWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(gated);
  const clock = createTestClock();

  const frame = new Frame({
    widgets: { gated },
    adapters: [adapter],
    clock,
    timeout: 500,
  });

  arm();

  const pending = frame.widget("gated").publish({ a: 1 });

  await settle();
  clock.advance(500);

  expect(await pending).toMatchObject({
    status: "invalid",
    reason: "schema-threw",
  });
  expect(control.calls()).toEqual([]);
  expect(clock.pending()).toBe(0);

  gates[0]?.();
  await settle();

  expect(control.calls()).toEqual([]);
  expect(frame.widget("gated").get()).toBeNull();
});

test("a schema that disposes the Frame before it answers does not leave its request waiting", async () => {
  const { frame, clock, hooks } = createReentrant();

  hooks.onValidate = () => frame.dispose();

  const pending = frame.widget("gated").publish({ a: 1 });

  await settle();

  expect(await getOutcomeOrPending(pending)).toBe("disposed");
  expect(clock.pending()).toBe(0);
});

test("a schema that starts a new context before it answers does not leave its request waiting", async () => {
  const { frame, hooks } = createReentrant();

  hooks.onValidate = () => frame.context({ reset: "preserve" });

  const pending = frame.widget("gated").publish({ a: 1 });

  await settle();

  expect(await getOutcomeOrPending(pending)).toBe("expired");
});

test("a slow schema while reading back does not hold the write domain once the provider answered", async () => {
  const { handle, clock, releases, seedSlow } = createSlowReadback();

  await seedSlow();

  const readback = handle.readback();

  await settle();
  clock.advance(500);
  await settle();

  expect((await handle.publish({ ok: 2 })).status).toBe("submitted");

  releases[0]?.();

  expect((await readback).status).toBe("failed");
});

test("a readback the provider answers after its context ended is expired, and the old account's entries are not parsed", async () => {
  const { frame, handle, control, clock, releases, seedSlow } =
    createSlowReadback();

  await seedSlow();
  control.script({ outcome: "hold" });

  const readback = handle.readback();

  await settle();
  await frame.context({ reset: "preserve" });
  control.held()[0]?.release();
  await settle();

  expect(await readback).toMatchObject({ status: "expired" });
  expect(releases).toEqual([]);
  expect(clock.pending()).toBe(0);
});

test("a readback the provider answers after dispose leaves no timer behind", async () => {
  const { frame, handle, control, clock, seedSlow } = createSlowReadback();

  await seedSlow();
  control.script({ outcome: "hold" });

  const readback = handle.readback();

  await settle();
  frame.dispose();
  control.held()[0]?.release();
  await settle();

  expect(await readback).toMatchObject({ status: "indeterminate" });
  expect(clock.pending()).toBe(0);
});
