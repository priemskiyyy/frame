import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import type { ReadbackAnswer } from "src/types/ReadbackAnswer";
import type { SubmissionResult } from "src/types/SubmissionResult";
import type { WidgetData } from "src/types/WidgetData";
import type { WidgetOpening } from "src/types/WidgetOpening";
import { Frame } from "src/utils/Frame";
import {
  createGatedFrame,
  createGatedSchema,
  createStreakFrame,
  ready,
  streak,
} from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

type StreakData = WidgetData<typeof streak>;

const NOW = 1_000_000;

const SUBMITTED: SubmissionResult = {
  status: "submitted",
  evidence: "simulated",
};

const getStatusOrPending = (pending: Promise<{ status: string }>) =>
  Promise.race([
    pending.then(({ status }) => status),
    settle().then(() => "pending"),
  ]);

const createBareHandle = () => {
  const { adapter } = createMockAdapter(streak);

  const bare = {
    ...adapter,
    open: (): WidgetOpening<StreakData> => ({
      status: "opened",
      session: { writeDomain: "bare", publish: () => SUBMITTED },
    }),
  };

  return new Frame({ widgets: { streak }, adapters: [bare] }).widget("streak");
};

test("a session's methods run on the session, whichever one the Frame calls", async () => {
  const log: string[] = [];

  const session = {
    writeDomain: "session:domain",
    tag: "session",
    publish(this: { tag: string }): SubmissionResult {
      log.push(`publish:${this.tag}`);

      return SUBMITTED;
    },
    publishTimeline(this: { tag: string }): SubmissionResult {
      log.push(`publishTimeline:${this.tag}`);

      return SUBMITTED;
    },
    reload(this: { tag: string }): SubmissionResult {
      log.push(`reload:${this.tag}`);

      return SUBMITTED;
    },
    readback(this: { tag: string }): ReadbackAnswer {
      log.push(`readback:${this.tag}`);

      return { status: "read", entries: [] };
    },
    dispose(this: { tag: string }) {
      log.push(`dispose:${this.tag}`);
    },
  };

  const { adapter } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [{ ...adapter, open: () => ({ status: "opened", session }) }],
    clock: createTestClock({ now: NOW }),
  });

  const handle = frame.widget("streak");

  await handle.publish(ready(1));
  await handle.publishTimeline([{ at: NOW, data: ready(2) }]);
  await handle.reload();
  await handle.readback();
  frame.dispose();

  expect(log).toEqual([
    "publish:session",
    "publishTimeline:session",
    "reload:session",
    "readback:session",
    "dispose:session",
  ]);
});

test("a reload answers what the provider answered, skipped, failed or uncertain", async () => {
  const { widget: handle, control } = createStreakFrame();
  const native = new Error("native");

  control.script(
    { outcome: "skip" },
    { outcome: "fail", error: native },
    { outcome: "indeterminate", error: native },
    { outcome: "throw", error: native },
  );

  expect(await handle.reload()).toMatchObject({
    status: "skipped",
    reason: "no-placements",
  });
  expect(await handle.reload()).toMatchObject({
    status: "failed",
    error: native,
  });
  expect(await handle.reload()).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error: native,
  });
  expect(await handle.reload()).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error: native,
  });
});

test("an operation the session leaves out answers unavailable, names it and has no remedy", async () => {
  const outcomes = [
    await createBareHandle().reload(),
    await createBareHandle().readback(),
    await createBareHandle().publishTimeline([
      { at: 0, data: { state: "empty" } },
    ]),
  ];

  expect(outcomes).toMatchObject([
    {
      status: "unavailable",
      reason: "The mock adapter does not provide reload.",
      remediation: null,
    },
    {
      status: "unavailable",
      reason: "The mock adapter does not provide readback.",
      remediation: null,
    },
    {
      status: "unavailable",
      reason: "The mock adapter does not provide publishTimeline.",
      remediation: null,
    },
  ]);
});

test("a reload and a readback on an unavailable adapter answer its reason and never ask it again", async () => {
  const { adapter } = createMockAdapter(streak);
  let opens = 0;

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          opens += 1;

          return {
            status: "unavailable",
            reason: "No host.",
            remediation: "Use a device.",
          };
        },
      },
    ],
  });

  const handle = frame.widget("streak");

  expect(await handle.reload()).toMatchObject({
    status: "unavailable",
    reason: "No host.",
    remediation: "Use a device.",
  });
  expect(await handle.readback()).toMatchObject({
    status: "unavailable",
    reason: "No host.",
  });
  expect(opens).toBe(1);
});

test("a reload answered after its deadline settles nothing twice", async () => {
  const {
    frame,
    widget: handle,
    control,
    clock,
  } = createStreakFrame({}, { timeout: 500 });

  control.script({ outcome: "hold" });

  const reload = handle.reload();

  await settle();
  clock.advance(500);

  expect(await reload).toMatchObject({
    status: "indeterminate",
    reason: "timeout",
  });

  const heard: string[] = [];

  frame.diagnostics.events.subscribe((event) => heard.push(event.type));
  control.held()[0]?.release();
  await settle();

  expect(heard).toEqual(["write-domain-unblocked"]);
});

test("a context that ends while a readback is being parsed settles it expired and leaves no timer", async () => {
  const { schema, arm, gates } = createGatedSchema();
  const gated = widget({ name: "GatedWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(gated);
  const clock = createTestClock();
  const frame = new Frame({ widgets: { gated }, adapters: [adapter], clock });

  control.seed([{ at: 1, data: { a: 1 } }]);
  arm();

  const readback = frame.widget("gated").readback();

  await settle();

  expect(gates).toHaveLength(1);

  await frame.context({ reset: "preserve" });

  expect(await getStatusOrPending(readback)).toBe("expired");
  expect(clock.pending()).toBe(0);
});

test("a Frame disposed while the value is being read settles the publication disposed at once", async () => {
  const { frame, widget: handle, arm } = createGatedFrame();

  arm();

  const data = new Proxy(
    { n: 1 },
    {
      ownKeys: (target) => {
        frame.dispose();

        return Reflect.ownKeys(target);
      },
    },
  );

  expect(await getStatusOrPending(handle.publish(data))).toBe("disposed");
});

test("a context that ends while the value is being read settles the publication expired at once", async () => {
  const { frame, widget: handle, arm } = createGatedFrame();

  arm();

  const data = new Proxy(
    { n: 1 },
    {
      ownKeys: (target) => {
        frame.context({ reset: "preserve" });

        return Reflect.ownKeys(target);
      },
    },
  );

  expect(await getStatusOrPending(handle.publish(data))).toBe("expired");
});
