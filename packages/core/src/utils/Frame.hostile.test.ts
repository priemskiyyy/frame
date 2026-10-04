import { expect, test } from "vitest";
import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetData } from "src/types/WidgetData";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import type { WidgetSession } from "src/types/WidgetSession";
import { Frame } from "src/utils/Frame";
import { createStreakFrame, ready, streak } from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

type StreakData = WidgetData<typeof streak>;
type StreakAdapter = WidgetAdapter<StreakData, "StreakWidget">;

type Cycle = { self?: Cycle };

const numbered = z.object({ n: z.number() });

const counted = widget({
  name: "CountedWidget",
  schema: numbered,
  fallback: { n: 0 },
});

const withSession = (
  adapter: StreakAdapter,
  patch: Partial<WidgetSession<StreakData>>,
): StreakAdapter => ({
  ...adapter,
  open: async () => {
    const opening = await adapter.open();

    if (opening.status !== "opened") {
      return opening;
    }

    return { status: "opened", session: { ...opening.session, ...patch } };
  },
});

const withoutTimeline = (adapter: StreakAdapter): StreakAdapter => ({
  ...adapter,
  open: async () => {
    const opening = await adapter.open();

    if (opening.status !== "opened") {
      return opening;
    }

    const session = { ...opening.session };

    delete session.publishTimeline;

    return { status: "opened", session };
  },
});

const getStatusOrPending = (pending: Promise<{ status: string }>) =>
  Promise.race([
    pending.then(({ status }) => status),
    settle().then(() => "pending"),
  ]);

test("a timeline entry whose instant throws when it is read is invalid, never an exception", async () => {
  const { widget: handle } = createStreakFrame();

  const entry = {
    get at(): number {
      throw new Error("boom");
    },
    data: ready(1),
  };

  expect(await handle.publishTimeline([entry])).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
  });
});

test("a timeline that is a revoked proxy is invalid, never an exception", async () => {
  const { widget: handle } = createStreakFrame();
  const { proxy, revoke } = Proxy.revocable([], {});

  revoke();

  expect(await handle.publishTimeline(proxy)).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
  });
});

test("publishing and disposing in the same turn never calls the adapter's open", async () => {
  const opens: string[] = [];
  const { adapter } = createMockAdapter(counted);

  const spy = {
    ...adapter,
    open: () => {
      opens.push("open");

      return adapter.open();
    },
  };

  const frame = new Frame({ widgets: { counted }, adapters: [spy] });
  const outcome = frame.widget("counted").publish({ n: 1 });

  frame.dispose();

  expect(await outcome).toMatchObject({ status: "disposed" });

  await settle();

  expect(opens).toEqual([]);
});

test("preparing and disposing in the same turn never calls the adapter's open", async () => {
  const opens: string[] = [];
  const { adapter } = createMockAdapter(counted);

  const spy = {
    ...adapter,
    open: () => {
      opens.push("open");

      return adapter.open();
    },
  };

  const frame = new Frame({ widgets: { counted }, adapters: [spy] });
  const preparing = frame.prepare();

  frame.dispose();
  await preparing;
  await settle();

  expect(opens).toEqual([]);
});

test("a readback answer without entries ends indeterminate at once", async () => {
  const { adapter } = createMockAdapter(streak);

  const bad = withSession(adapter, {
    readback: () => JSON.parse('{ "status": "read", "entries": null }'),
  });

  const frame = new Frame({
    widgets: { streak },
    adapters: [bad],
    clock: createTestClock({ now: 1_000_000 }),
    timeout: 500,
  });

  expect(await getStatusOrPending(frame.widget("streak").readback())).toBe(
    "indeterminate",
  );
});

test("a readback that is not an answer at all is indeterminate with INVALID_ANSWER", async () => {
  const { adapter } = createMockAdapter(streak);

  const bad = withSession(adapter, {
    readback: () => JSON.parse("null"),
  });

  const frame = new Frame({ widgets: { streak }, adapters: [bad] });
  const outcome = await frame.widget("streak").readback();

  expect(outcome).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error: { code: "INVALID_ANSWER" },
  });
});

test("a forced request whose schema publishes again before it answers still forces a write", async () => {
  const hooks = { onValidate: () => {} };

  const schema: StandardSchema<JsonRecord, JsonRecord> = {
    "~standard": {
      version: 1,
      vendor: "reentrant",
      validate: (value) => {
        hooks.onValidate();

        return { value };
      },
    },
  };

  const reentrant = widget({
    name: "ReentrantWidget",
    schema,
    fallback: { n: 0 },
  });

  const { adapter, control } = createMockAdapter(reentrant);
  const frame = new Frame({ widgets: { reentrant }, adapters: [adapter] });
  const handle = frame.widget("reentrant");

  await handle.publish({ n: 1 });

  const nested: Promise<{ status: string }>[] = [];

  hooks.onValidate = () => {
    hooks.onValidate = () => {};

    nested.push(handle.publish({ n: 1 }));
  };

  await handle.publish({ n: 1 }, { force: true });
  await Promise.all(nested);

  expect(
    control.calls().filter(({ operation }) => operation === "publish"),
  ).toHaveLength(2);
});

test("a failed answer whose error cannot be frozen still settles the request", async () => {
  const { adapter } = createMockAdapter(streak);
  const cyclic: Cycle = {};

  cyclic.self = cyclic;

  const stubborn = withSession(adapter, {
    publish: () =>
      Object.assign(JSON.parse('{ "status": "failed" }'), { error: cyclic }),
  });

  const frame = new Frame({ widgets: { streak }, adapters: [stubborn] });

  expect(
    await getStatusOrPending(frame.widget("streak").publish(ready(1))),
  ).not.toBe("pending");
});

test("a readback the provider answers after its deadline does not run the schema", async () => {
  let validations = 0;

  const schema: StandardSchema<JsonRecord, JsonRecord> = {
    "~standard": {
      version: 1,
      vendor: "count",
      validate: (value) => {
        validations += 1;

        return { value };
      },
    },
  };

  const probe = widget({ name: "ProbeWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(probe);
  const clock = createTestClock();

  const frame = new Frame({
    widgets: { probe },
    adapters: [adapter],
    clock,
    timeout: 500,
  });

  control.seed([{ at: 1, data: { a: 1 } }]);
  control.script({ outcome: "hold" });

  const pending = frame.widget("probe").readback();

  await settle();
  clock.advance(600);

  expect(await pending).toMatchObject({
    status: "indeterminate",
    reason: "timeout",
  });

  const before = validations;

  control.held()[0]?.release();
  await settle();

  expect(validations).toBe(before);
});

test("a definition widget() did not make cannot dodge the name rule or the fallback check", () => {
  const forgedName: WidgetDefinition<"Not a valid name!", { days: number }> = {
    name: "Not a valid name!",
    schema: z.object({ days: z.number().int().nonnegative() }),
    fallback: { days: 0 },
  };

  const forgedFallback: WidgetDefinition<"Forged", { days: number }> = {
    name: "Forged",
    schema: z.object({ days: z.number().int().nonnegative() }),
    fallback: { days: -5 },
  };

  expect(() => new Frame({ widgets: { forgedName } })).toThrowError(
    expect.objectContaining({ code: "INVALID_CONFIGURATION" }),
  );
  expect(() => new Frame({ widgets: { forgedFallback } })).toThrowError(
    expect.objectContaining({ code: "INVALID_CONFIGURATION" }),
  );
});

test("preparing a Frame with no adapters does not flash preparing", async () => {
  const frame = new Frame({ widgets: { streak } });
  const handle = frame.widget("streak");
  const states: string[] = [];

  handle.status.subscribe(() =>
    states.push(handle.status.get().lifecycle.state),
  );
  await frame.prepare();

  expect(states).toEqual([]);
});

test("each context announces its own epoch once, even when a listener starts another", async () => {
  const { frame, widget: handle } = createStreakFrame();

  await handle.publish(ready(1));

  const epochs: number[] = [];
  let again = false;

  frame.diagnostics.events.subscribe((event) => {
    if (event.type !== "context-started") {
      return;
    }

    epochs.push(event.epoch);
  });
  handle.subscribe(() => {
    if (again) {
      return;
    }

    again = true;
    frame.context();
  });
  await frame.context();
  await settle();

  expect([...epochs].sort()).toEqual([2, 3]);
});

test("a request is announced accepted before the settled event that names it in by", async () => {
  const { frame, widget: handle, control } = createStreakFrame();
  const heard: string[] = [];

  frame.diagnostics.events.subscribe((event) => {
    if (event.type === "request-accepted") {
      heard.push(`accepted ${event.request.id}`);

      return;
    }

    if (event.type !== "request-settled") {
      return;
    }

    heard.push(`settled ${event.request.id} ${event.outcome.status}`);
  });
  control.script({ outcome: "hold" });

  const first = handle.publish(ready(1));

  await settle();

  const second = handle.publish(ready(2));
  const third = handle.publish(ready(3));

  await settle();
  control.held()[0]?.release();
  await Promise.all([first, second, third]);

  expect(heard.indexOf("accepted r3")).toBeLessThan(
    heard.indexOf("settled r2 superseded"),
  );
});

test("write-domain events are heard after every widget on the domain reads the new state", async () => {
  const one = widget({
    name: "OneWidget",
    schema: numbered,
    fallback: { n: 0 },
  });

  const two = widget({
    name: "TwoWidget",
    schema: numbered,
    fallback: { n: 0 },
  });

  const clock = createTestClock();
  const mockOne = createMockAdapter(one, { writeDomain: "shared" });
  const mockTwo = createMockAdapter(two, { writeDomain: "shared" });

  const frame = new Frame({
    widgets: { one, two },
    adapters: [mockOne.adapter, mockTwo.adapter],
    clock,
    timeout: 500,
  });

  await frame.prepare();

  const seen: string[] = [];

  frame.diagnostics.events.subscribe((event) => {
    const work = frame.widget("two").status.get().work;

    if (event.type === "write-domain-blocked") {
      seen.push(`blocked: two is ${work}`);

      return;
    }

    if (event.type !== "write-domain-unblocked") {
      return;
    }

    seen.push(`unblocked: two is ${work}`);
  });
  mockOne.control.script({ outcome: "hold" });

  const stuck = frame.widget("one").publish({ n: 1 });

  await settle();
  clock.advance(600);
  await stuck;
  mockOne.control.held()[0]?.release();
  await settle();

  expect(seen).toEqual(["blocked: two is blocked", "unblocked: two is idle"]);
});

test("an advance made inside a timer callback is not undone by the advance that fired it", () => {
  const clock = createTestClock({ now: 1000 });

  clock.setTimer(() => clock.advance(100), 50);
  clock.advance(60);

  expect(clock.now()).toBe(1150);
});

test("a timeline the hosting adapter lacks does not take the place of a waiting snapshot", async () => {
  const { adapter, control } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [withoutTimeline(adapter)],
  });

  const handle = frame.widget("streak");

  control.script({ outcome: "hold" });

  const inFlight = handle.publish(ready(1));

  await settle();

  const snapshot = handle.publish(ready(2));
  const timeline = handle.publishTimeline([{ at: 0, data: ready(3) }]);

  await settle();
  control.held()[0]?.release();

  const outcomes = await Promise.all([inFlight, snapshot, timeline]);
  const sent: JsonRecord[] = [];

  for (const call of control.calls()) {
    if (call.operation !== "publish") {
      continue;
    }

    sent.push(call.data);
  }

  expect(outcomes.map(({ status }) => status)).toEqual([
    "submitted",
    "submitted",
    "unavailable",
  ]);
  expect(sent).toEqual([ready(1), ready(2)]);
});

test("an adapter answer that cannot be printed is still INVALID_ANSWER", async () => {
  const { adapter } = createMockAdapter(streak);
  const cyclic: Cycle = {};

  cyclic.self = cyclic;

  const bad = withSession(adapter, {
    publish: () => Object.assign(JSON.parse('{ "status": "zzz" }'), cyclic),
  });

  const frame = new Frame({ widgets: { streak }, adapters: [bad] });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error: { code: "INVALID_ANSWER" },
  });
});

test("a snapshot read while a widgetless Frame announces its disposal says disposed", () => {
  const frame = new Frame({ widgets: {} });
  let seen = "";

  frame.diagnostics.get();
  frame.diagnostics.events.subscribe((event) => {
    if (event.type !== "frame-disposed") {
      return;
    }

    seen = frame.diagnostics.get().state;
  });
  frame.dispose();

  expect(seen).toBe("disposed");
});

test("a clock that throws while a diagnostics listener is attached does not wedge opening", async () => {
  let broken = false;

  const clock = {
    now: () => {
      if (broken) {
        throw new Error("clock failed");
      }

      return 1;
    },
    setTimer: () => () => {},
  };

  const { adapter } = createMockAdapter(streak);
  const frame = new Frame({ widgets: { streak }, adapters: [adapter], clock });

  frame.diagnostics.events.subscribe(() => {});
  broken = true;

  expect(
    await getStatusOrPending(frame.widget("streak").publish(ready(1))),
  ).not.toBe("pending");
});

test("write-domain-blocked is not announced after frame-disposed", async () => {
  const {
    frame,
    clock,
    control,
    widget: handle,
  } = createStreakFrame({}, { timeout: 500 });

  const heard: string[] = [];

  frame.diagnostics.events.subscribe((event) => heard.push(event.type));
  control.script({ outcome: "hold" });

  const stuck = handle.publish(ready(1));

  await settle();
  handle.status.subscribe(() => {
    if (handle.status.get().latest?.status !== "indeterminate") {
      return;
    }

    frame.dispose();
  });
  clock.advance(600);
  await stuck;
  await settle();

  expect(heard.at(-1)).toBe("frame-disposed");
});

test("context-started is not announced after frame-disposed", async () => {
  const { frame, widget: handle } = createStreakFrame();

  await handle.publish(ready(1));

  const heard: string[] = [];

  frame.diagnostics.events.subscribe((event) => heard.push(event.type));
  handle.subscribe(() => frame.dispose());
  await frame.context();
  await settle();

  expect(heard.at(-1)).toBe("frame-disposed");
});
