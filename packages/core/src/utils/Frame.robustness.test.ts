import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import type { StandardSchemaResult } from "src/types/StandardSchemaResult";
import type { WidgetData } from "src/types/WidgetData";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetOpening } from "src/types/WidgetOpening";
import { captureRethrown } from "src/utils/common/captureRethrown.fixture";
import { Frame } from "src/utils/Frame";
import {
  createGatedFrame,
  createStreakFrame,
  ready,
  streak,
} from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

type StreakData = WidgetData<typeof streak>;

const createSchemaFrame = (
  answer: (
    value: JsonRecord,
  ) =>
    | StandardSchemaResult<JsonRecord>
    | Promise<StandardSchemaResult<JsonRecord>>,
) => {
  let armed = false;

  const schema: StandardSchema<JsonRecord, JsonRecord> = {
    "~standard": {
      version: 1,
      vendor: "scripted",
      validate: (value) => {
        if (!armed) {
          return { value };
        }

        return answer(value);
      },
    },
  };

  const scripted = widget({ name: "ScriptedWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(scripted);
  const frame = new Frame({ widgets: { scripted }, adapters: [adapter] });

  armed = true;

  return { widget: frame.widget("scripted"), control };
};

test("an asynchronous schema that rejects makes the publication invalid", async () => {
  const { widget: handle } = createSchemaFrame(() =>
    Promise.reject(new Error("boom")),
  );

  expect(await handle.publish({})).toMatchObject({
    status: "invalid",
    reason: "schema-threw",
  });
});

test("an asynchronous schema that resolves nothing makes the publication invalid, and the widget idle", async () => {
  const { widget: handle } = createSchemaFrame(() =>
    Promise.resolve(JSON.parse("null")),
  );

  expect(await handle.publish({})).toMatchObject({
    status: "invalid",
    reason: "schema-threw",
  });
  expect(handle.status.get().work).toBe("idle");
});

test("an asynchronous schema that resolves issues without a list makes the publication invalid", async () => {
  const { widget: handle } = createSchemaFrame(() =>
    Promise.resolve(JSON.parse('{ "issues": 7 }')),
  );

  expect(await handle.publish({})).toMatchObject({
    status: "invalid",
    reason: "schema-threw",
  });
});

test("a revoked proxy is invalid, never an exception", async () => {
  const { widget: handle } = createStreakFrame();
  const { proxy, revoke } = Proxy.revocable(JSON.parse("{}"), {});

  revoke();

  expect(await handle.publish(proxy)).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
  });
});

test("a value whose reading overflows the stack is invalid, never an exception", async () => {
  const { widget: handle, control } = createStreakFrame();

  const overflowing = new Proxy(JSON.parse("{}"), {
    ownKeys: () => {
      throw new RangeError("Maximum call stack size exceeded");
    },
  });

  expect(await handle.publish(overflowing)).toMatchObject({
    status: "invalid",
    reason: "not-transportable",
    issues: [
      {
        message:
          "The value could not be read: Maximum call stack size exceeded",
      },
    ],
  });
  expect(control.calls()).toEqual([]);
});

test("a readback whose entries are garbage settles instead of hanging", async () => {
  const { widget: handle, control } = createStreakFrame();

  control.seed(JSON.parse("[null]"));

  expect(await handle.readback()).toMatchObject({
    status: "read",
    entries: [],
    rejected: 1,
  });
});

test("an adapter whose open answers nothing is a failed request, not a stuck host", async () => {
  const { adapter } = createMockAdapter(streak);
  const bad = { ...adapter, open: () => JSON.parse("null") };
  const frame = new Frame({ widgets: { streak }, adapters: [bad] });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "failed",
  });
  expect(await frame.prepare()).toMatchObject({
    widgets: { streak: { status: "failed" } },
  });
});

test("an adapter that opens without a session is a failed request", async () => {
  const { adapter } = createMockAdapter(streak);
  const bad = { ...adapter, open: () => JSON.parse('{ "status": "opened" }') };
  const frame = new Frame({ widgets: { streak }, adapters: [bad] });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "failed",
  });
});

test("an adapter whose open never answers fails the request at the Frame's deadline, and a later answer is released", async () => {
  const clock = createTestClock();
  const { adapter, control } = createMockAdapter(streak);
  const release = { open: () => {} };

  const slow = {
    ...adapter,
    open: () =>
      new Promise<WidgetOpening<StreakData>>((resolve) => {
        release.open = () => resolve(adapter.open());
      }),
  };

  const frame = new Frame({
    widgets: { streak },
    adapters: [slow],
    clock,
    timeout: 500,
  });

  const outcome = frame.widget("streak").publish(ready(1));

  await settle();
  clock.advance(500);

  expect(await outcome).toMatchObject({ status: "failed" });

  release.open();
  await settle();

  expect(control.sessions()).toBe(0);
});

test("a provider session that throws while it is disposed is not an exception in the host", async () => {
  const rethrown = captureRethrown();
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
          dispose: () => {
            throw new Error("native dispose failed");
          },
        },
      };
    },
  };

  const frame = new Frame({ widgets: { streak }, adapters: [bad] });
  const events: string[] = [];

  await frame.widget("streak").publish(ready(1));
  frame.diagnostics.events.subscribe((event) => events.push(event.type));

  expect(() => frame.dispose()).not.toThrow();

  await settle();

  expect(events).toEqual(["widget-dispose-failed", "frame-disposed"]);
  expect(rethrown()).toEqual([]);
});

test("a request validating when the Frame is disposed settles disposed at once", async () => {
  const { frame, widget: handle, arm } = createGatedFrame();

  arm();

  const pending = handle.publish({ n: 1 });

  frame.dispose();

  expect(await pending).toMatchObject({ status: "disposed" });
});

test("a request validating when the context ends settles expired at once, and what it was validating never lands", async () => {
  const { frame, widget: handle, control, arm, gates } = createGatedFrame();

  arm();

  const pending = handle.publish({ n: 1 });

  await frame.context({ reset: "preserve" });

  expect(await pending).toMatchObject({ status: "expired" });

  gates[0]?.();
  await settle();

  expect(control.calls()).toEqual([]);
});

test("an error from another realm keeps its message when it is thrown, and is left alone when it is answered", async () => {
  const thrown = createStreakFrame();
  const foreign: Error = runInNewContext("new Error('native failure')");

  thrown.control.script({ outcome: "throw", error: foreign });

  const outcome = await thrown.widget.publish(ready(1));

  expect(outcome.status === "indeterminate" && outcome.error?.message).toBe(
    "native failure",
  );

  const answered = createStreakFrame();
  const other: Error = runInNewContext("new Error('native failure')");

  answered.control.script({ outcome: "fail", error: other });
  await answered.widget.publish(ready(1));

  expect(Object.isFrozen(other)).toBe(false);
});

test("an adapter that answers nothing is indeterminate with INVALID_ANSWER, never a thrown TypeError", async () => {
  const { adapter } = createMockAdapter(streak);

  const forgetful: WidgetAdapter<StreakData, "StreakWidget"> = {
    ...adapter,
    open: () => ({
      status: "opened",
      session: {
        writeDomain: "forgetful",
        publish: () => JSON.parse("null"),
      },
    }),
  };

  const frame = new Frame({
    widgets: { streak },
    adapters: [forgetful],
    clock: createTestClock(),
  });

  const outcome = await frame.widget("streak").publish(ready(1));

  expect(outcome.status === "indeterminate" && outcome.error).toMatchObject({
    code: "INVALID_ANSWER",
  });
});

test("a timeline entry whose instant changes with every read is read once, and the adapter gets that reading", async () => {
  const { widget: handle, control } = createStreakFrame();
  let reads = 0;

  const entry = {
    get at() {
      reads += 1;

      return 999_900 + reads;
    },
    data: ready(1),
  };

  await handle.publishTimeline([entry]);

  const [call] = control.calls();

  expect(reads).toBe(1);
  expect(call?.operation === "publishTimeline" && call.entries[0]?.at).toBe(
    999_901,
  );
});

test("a timeline that is not a list of entries is invalid, never an exception", async () => {
  const { widget: handle } = createStreakFrame();

  expect(await handle.publishTimeline(JSON.parse("{}"))).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
  expect(await handle.publishTimeline(JSON.parse("[null]"))).toMatchObject({
    status: "invalid",
    reason: "invalid-timeline",
  });
});
