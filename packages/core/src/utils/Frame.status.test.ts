import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import { Frame } from "src/utils/Frame";
import {
  createGatedFrame,
  createStreakFrame,
  ready,
  streak,
} from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

test("a write domain stuck on another widget reads blocked, even for a request that is itself waiting to be sent", async () => {
  const sibling = widget({
    name: "SiblingWidget",
    schema: streak.schema,
    fallback: { state: "empty" },
  });

  const first = createMockAdapter(streak, { writeDomain: "shared" });
  const second = createMockAdapter(sibling, { writeDomain: "shared" });
  const clock = createTestClock({ now: 1_000_000 });

  const frame = new Frame({
    widgets: { streak, sibling },
    adapters: [first.adapter, second.adapter],
    clock,
    timeout: 500,
  });

  await frame.prepare();
  first.control.script({ outcome: "hold" });
  frame.widget("streak").publish(ready(1));
  await settle();
  clock.advance(500);

  const pending = frame.widget("sibling").publish(ready(2));

  expect(frame.widget("sibling").status.get().work).toBe("blocked");
  expect((await pending).status).toBe("blocked");
});

test("a request in a provider call reads submitting, though an older one is still being validated", async () => {
  const { widget: handle, control, arm, gates } = createGatedFrame();

  arm();
  control.script({ outcome: "hold" });

  const older = handle.publish({ n: 1 });

  handle.publish({ n: 2 });
  gates[1]?.();
  await settle();

  expect(handle.status.get().work).toBe("submitting");

  gates[0]?.();
  control.held()[0]?.release();

  expect((await older).status).toBe("superseded");
});

test("a reload in flight reads submitting, and idle once it answered", async () => {
  const { widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const reload = handle.reload();

  await settle();

  expect(handle.status.get().work).toBe("submitting");

  control.held()[0]?.release();
  await reload;

  expect(handle.status.get().work).toBe("idle");
});

test("a handle whose context ended reads idle while its call is still in flight", async () => {
  const { frame, widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const inFlight = handle.publish(ready(1));

  await settle();

  expect(handle.status.get().work).toBe("submitting");

  await frame.context({ reset: "preserve" });

  expect(handle.status.get().work).toBe("idle");

  control.held()[0]?.release();
  await inFlight;
});

test("an outcome that arrives after the context ended is not the old handle's latest", async () => {
  const { frame, widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const inFlight = handle.publish(ready(1));

  await settle();
  await frame.context({ reset: "preserve" });
  control.held()[0]?.release();

  expect((await inFlight).status).toBe("submitted");
  expect(handle.status.get().latest).toBeNull();
});

test("a superseded request is never the latest outcome", async () => {
  const { widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const inFlight = handle.publish(ready(1));

  await settle();

  const waiting = handle.publish(ready(2));

  handle.publish(ready(3));

  expect((await waiting).status).toBe("superseded");
  expect(handle.status.get().latest).toBeNull();

  control.held()[0]?.release();
  await inFlight;
});

test("an outcome alone is a change of status, and is announced", async () => {
  const { widget: handle } = createStreakFrame();
  let heard = 0;

  handle.status.subscribe(() => {
    heard += 1;
  });

  await handle.publish({ state: "ready", days: -1 });

  expect(handle.status.get().latest).toMatchObject({ status: "invalid" });
  expect(heard).toBe(1);
});

test("a newer accepted revision is a change of status, though the call before it is still in flight", async () => {
  const { widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" });
  handle.publish(ready(1));
  await settle();

  let heard = 0;

  handle.status.subscribe(() => {
    heard += 1;
  });
  handle.publish(ready(2));

  expect(handle.status.get().desired).toEqual({
    state: "accepted",
    origin: "publication",
    revision: 2,
  });
  expect(heard).toBe(1);
});

test("a readback that finished leaves no timer behind", async () => {
  const { widget: handle, clock } = createStreakFrame();

  await handle.readback();

  expect(clock.pending()).toBe(0);
});
