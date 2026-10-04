import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import type { JsonRecord } from "src/types/JsonRecord";
import { Frame } from "src/utils/Frame";
import { createStreakFrame, ready, streak } from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

const NOW = 1_000_000;

const getPublished = (
  control: ReturnType<typeof createStreakFrame>["control"],
) => {
  const published: JsonRecord[] = [];

  for (const call of control.calls()) {
    if (call.operation !== "publish") {
      continue;
    }

    published.push(call.data);
  }

  return published;
};

test("a reset is sent again only when forced", async () => {
  const { widget: handle, control } = createStreakFrame();

  expect((await handle.reset()).status).toBe("submitted");
  expect((await handle.reset()).status).toBe("unchanged");
  expect((await handle.reset({ force: true })).status).toBe("submitted");
  expect(control.calls()).toHaveLength(2);
});

test("a timeline is sent again only when forced", async () => {
  const { widget: handle, control } = createStreakFrame();
  const entries = [{ at: NOW, data: ready(1) }];

  expect((await handle.publishTimeline(entries)).status).toBe("submitted");
  expect((await handle.publishTimeline(entries)).status).toBe("unchanged");
  expect((await handle.publishTimeline(entries, { force: true })).status).toBe(
    "submitted",
  );
  expect(control.calls()).toHaveLength(2);
});

test("only an uncertain or skipped write makes the submitted content unknown", async () => {
  const { widget: handle, control } = createStreakFrame();
  const statuses: string[] = [];

  statuses.push((await handle.publish(ready(1))).status);
  statuses.push((await handle.publish({ state: "ready", days: -1 })).status);
  statuses.push((await handle.publish(ready(1))).status);
  control.script({ outcome: "fail" });
  statuses.push((await handle.publish(ready(2))).status);
  statuses.push((await handle.publish(ready(1))).status);

  expect(statuses).toEqual([
    "submitted",
    "invalid",
    "unchanged",
    "failed",
    "unchanged",
  ]);
  expect(getPublished(control)).toEqual([ready(1), ready(2)]);
});

test("a force that already reached the provider is not handed to a later request", async () => {
  const { widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" });

  const forced = handle.publish(ready(1), { force: true });

  await settle();

  const later = handle.publish(ready(1));

  control.held()[0]?.release();

  expect((await forced).status).toBe("submitted");
  expect((await later).status).toBe("unchanged");
  expect(control.calls()).toHaveLength(1);
});

test("a publication waiting behind a queued reload is still superseded by a newer one", async () => {
  const { widget: handle, control } = createStreakFrame();

  control.script({ outcome: "hold" }, { outcome: "hold" });

  const write = handle.publish(ready(1));

  await settle();

  const reload = handle.reload();

  await settle();

  const waiting = handle.publish(ready(2));

  await settle();
  control.held()[0]?.release();
  await write;
  await settle();

  const newest = handle.publish(ready(3));

  control.held()[0]?.release();
  await Promise.all([reload, waiting, newest]);

  expect((await waiting).status).toBe("superseded");
  expect(control.calls().map(({ operation }) => operation)).toEqual([
    "publish",
    "reload",
    "publish",
  ]);
  expect(getPublished(control)).toEqual([ready(1), ready(3)]);
});

test("a forced request the lane refused leaves no force for the next request", async () => {
  const sibling = widget({
    name: "SiblingWidget",
    schema: streak.schema,
    fallback: { state: "empty" },
  });

  const first = createMockAdapter(streak, { writeDomain: "shared" });
  const second = createMockAdapter(sibling, { writeDomain: "shared" });
  const clock = createTestClock({ now: NOW });

  const frame = new Frame({
    widgets: { streak, sibling },
    adapters: [first.adapter, second.adapter],
    clock,
    timeout: 500,
  });

  const one = frame.widget("streak");

  await one.publish(ready(1));
  second.control.script({ outcome: "hold" });
  frame.widget("sibling").publish(ready(9));
  await settle();
  clock.advance(500);

  expect((await one.publish(ready(1), { force: true })).status).toBe("blocked");

  second.control.held()[0]?.release();
  await settle();

  expect((await one.publish(ready(1))).status).toBe("unchanged");
  expect(first.control.calls()).toHaveLength(1);
});
