import { expect, test } from "vitest";
import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetData } from "src/types/WidgetData";
import { Frame } from "src/utils/Frame";
import { ready, streak } from "src/utils/Frame.fixture";
import { widget } from "src/utils/widget";

type StreakData = WidgetData<typeof streak>;

const named = (
  name: string,
  adapter: WidgetAdapter<StreakData, "StreakWidget">,
) => ({
  ...adapter,
  name,
});

test("a widget is hosted by the first adapter that can work here", async () => {
  const absent = createMockAdapter(streak, {
    unavailable: { reason: "No app group.", remediation: "Rebuild." },
  });

  const present = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      named("first", absent.adapter),
      named("second", present.adapter),
    ],
  });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "submitted",
  });
  expect(present.control.calls()).toEqual([
    { operation: "publish", data: ready(1) },
  ]);
  expect(frame.diagnostics.get().widgets.streak?.adapter).toEqual({
    name: "second",
  });
});

test("an adapter listed later is never opened once an earlier one is", async () => {
  const first = createMockAdapter(streak);
  const second = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [first.adapter, second.adapter],
  });

  await frame.widget("streak").publish(ready(1));

  expect(first.control.sessions()).toBe(1);
  expect(second.control.sessions()).toBe(0);
  expect(second.control.calls()).toEqual([]);
});

test("a widget no adapter was given for answers unavailable and says how to fix it", async () => {
  const frame = new Frame({ widgets: { streak } });
  const widgetHandle = frame.widget("streak");

  expect(await widgetHandle.publish(ready(1))).toEqual({
    request: { id: "r1" },
    status: "unavailable",
    reason: 'Nothing hosts "streak" here: no adapter was given for it.',
    remediation: "Pass an adapter for this platform in `adapters`.",
  });
  expect(widgetHandle.status.get().lifecycle).toMatchObject({
    state: "unavailable",
  });
  expect(frame.diagnostics.get().widgets.streak?.adapter).toBeNull();
});

test("one refusing adapter is the whole answer, with its own reason", async () => {
  const { adapter } = createMockAdapter(streak, {
    unavailable: { reason: "No app group.", remediation: "Rebuild." },
  });

  const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "unavailable",
    reason: "No app group.",
    remediation: "Rebuild.",
  });
});

test("when every adapter refuses, the answer names each one's reason", async () => {
  const ios = createMockAdapter(streak, {
    unavailable: { reason: "Needs an app group." },
  });

  const android = createMockAdapter(streak, {
    unavailable: {
      reason: "Needs a placed widget.",
      remediation: "Place one.",
    },
  });

  const frame = new Frame({
    widgets: { streak },
    adapters: [named("expo", ios.adapter), named("android", android.adapter)],
  });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "unavailable",
    reason: "expo: Needs an app group. android: Needs a placed widget.",
    remediation: "android: Place one.",
  });
});

test("when several adapters refuse with advice, each one's remediation is named", async () => {
  const ios = createMockAdapter(streak, {
    unavailable: { reason: "No app group.", remediation: "Rebuild." },
  });

  const android = createMockAdapter(streak, {
    unavailable: { reason: "No widget.", remediation: "Place one." },
  });

  const frame = new Frame({
    widgets: { streak },
    adapters: [named("expo", ios.adapter), named("android", android.adapter)],
  });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    remediation: "expo: Rebuild. android: Place one.",
  });
});

test("an adapter that throws while opening stops the search, and the next publish asks again", async () => {
  const error = new Error("native module missing");
  const later = createMockAdapter(streak);
  const broken = createMockAdapter(streak);
  let attempts = 0;

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...broken.adapter,
        open: () => {
          attempts += 1;

          if (attempts === 1) {
            throw error;
          }

          return broken.adapter.open();
        },
      },
      later.adapter,
    ],
  });

  expect(await frame.widget("streak").publish(ready(1))).toMatchObject({
    status: "failed",
    error,
  });
  expect(later.control.sessions()).toBe(0);
  expect((await frame.widget("streak").publish(ready(1))).status).toBe(
    "submitted",
  );
  expect(broken.control.calls()).toHaveLength(1);
});

test("each adapter goes to the widget whose definition it names, in the order listed", async () => {
  const agenda = widget({
    name: "AgendaWidget",
    schema: z.object({ items: z.array(z.string()) }),
    fallback: { items: [] },
  });

  const first = createMockAdapter(streak);
  const second = createMockAdapter(agenda);
  const third = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak, agenda },
    adapters: [first.adapter, second.adapter, third.adapter],
  });

  await frame.widget("agenda").publish({ items: ["a"] });
  await frame.widget("streak").publish(ready(2));

  expect(second.control.calls()).toEqual([
    { operation: "publish", data: { items: ["a"] } },
  ]);
  expect(first.control.calls()).toEqual([
    { operation: "publish", data: ready(2) },
  ]);
  expect(third.control.sessions()).toBe(0);
});

test("preparing again asks the adapters again after none could host the widget", async () => {
  let available = false;
  const { adapter } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [
      {
        ...adapter,
        open: () => {
          if (!available) {
            return {
              status: "unavailable",
              reason: "Not yet.",
              remediation: null,
            };
          }

          return adapter.open();
        },
      },
    ],
  });

  expect(await frame.prepare()).toEqual({
    widgets: {
      streak: { status: "unavailable", reason: "Not yet.", remediation: null },
    },
  });

  available = true;

  expect(await frame.prepare()).toEqual({
    widgets: { streak: { status: "ready" } },
  });
});
