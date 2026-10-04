import { Frame, widget } from "@priemskiyyy/frame";
import { createTestClock } from "@priemskiyyy/frame/mock";
import { createElement } from "react";
import { expect, test } from "vitest";
import { z } from "zod";

import {
  createFakeVoltraIosClient,
  Label,
} from "src/fakeVoltraIosClient.fixture";
import type { VoltraWidgetVariants } from "src/types/VoltraWidgetVariants";
import { voltraPayloadWidget } from "src/voltraPayloadWidget";

const NOW = 1_000_000;

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const render = (props: { days: number }): VoltraWidgetVariants => ({
  systemSmall: createElement(Label, null, `${props.days}`),
  accessoryInline: createElement(Label, null, `${props.days} days`),
});

const create = (
  options: Parameters<typeof createFakeVoltraIosClient>[0] = {},
  renderWidget: typeof render = render,
) => {
  const fake = createFakeVoltraIosClient(options);

  const adapter = voltraPayloadWidget(streak, {
    sdk: fake.sdk,
    render: renderWidget,
  });

  return { fake, adapter };
};

const open = async (adapter: ReturnType<typeof create>["adapter"]) => {
  const opening = await adapter.open();

  if (opening.status !== "opened") {
    throw new Error("The adapter did not open.");
  }

  return opening.session;
};

const createFrame = (
  options: Parameters<typeof createFakeVoltraIosClient>[0] = {},
  renderWidget: typeof render = render,
) => {
  const { fake, adapter } = create(options, renderWidget);

  const frame = new Frame({
    widgets: { streak },
    adapters: [adapter],
    clock: createTestClock({ now: NOW }),
  });

  return { fake, frame, widget: frame.widget("streak") };
};

const throwOnThree = (props: { days: number }) => {
  if (props.days === 3) {
    throw new Error("render failure");
  }

  return render(props);
};

test("creating the adapter calls the SDK nothing, and names itself", () => {
  const { fake, adapter } = create();

  expect(fake.calls).toEqual([]);
  expect(adapter.name).toBe("voltra-ios");
  expect(adapter.definition).toBe(streak);
});

test("opening asks the SDK whether it runs on Apple and nothing else", async () => {
  const { fake, adapter } = create();

  await open(adapter);

  expect(fake.calls).toEqual(["assertRunningOnApple"]);
});

test("every opening probes again and is a session of its own", async () => {
  const { fake, adapter } = create();

  const first = await open(adapter);
  const second = await open(adapter);

  expect(first).not.toBe(second);
  expect(fake.calls).toEqual(["assertRunningOnApple", "assertRunningOnApple"]);
});

test("a snapshot is updateWidget with the widget name and the rendered variants, answered as a resolved promise", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);

  expect(await session.publish({ days: 4 })).toEqual({
    status: "submitted",
    evidence: "sdk-promise-resolved",
  });
  expect(fake.calls).toEqual([
    "assertRunningOnApple",
    "updateWidget:StreakWidget",
  ]);
  expect(fake.snapshot("StreakWidget")).toEqual(render({ days: 4 }));
  expect(fake.snapshot("StreakWidget")).not.toEqual(render({ days: 5 }));
});

test("the write domain is the native widget kind", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  expect(session.writeDomain).toBe("voltra-ios:StreakWidget");
});

test("the adapter provides a timeline and a reload, and no readback", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  expect(typeof session.publishTimeline).toBe("function");
  expect(typeof session.reload).toBe("function");
  expect(session.readback).toBeUndefined();
});

test("a render that throws is failed with its own error, and nothing reached the SDK", async () => {
  const { fake, adapter } = create({}, throwOnThree);
  const session = await open(adapter);

  const answer = await session.publish({ days: 3 });

  expect(answer).toMatchObject({
    status: "failed",
    error: expect.objectContaining({ message: "render failure" }),
  });
  expect(fake.calls).toEqual(["assertRunningOnApple"]);
  expect(fake.snapshot("StreakWidget")).toBeNull();
});

test("a render that throws something that is not an Error is still failed with an Error", async () => {
  const { fake, adapter } = create({}, () => {
    throw "not an error";
  });

  const session = await open(adapter);
  const answer = await session.publish({ days: 1 });

  expect(answer).toMatchObject({
    status: "failed",
    error: expect.objectContaining({
      message: "The render function threw a value that is not an Error.",
    }),
  });
  expect(answer.status === "failed" && answer.error).toBeInstanceOf(Error);
  expect(fake.calls).toEqual(["assertRunningOnApple"]);
});

test("the render function runs before the SDK is called, with the published data", async () => {
  const seen: { days: number; calls: string[] }[] = [];
  const fake = createFakeVoltraIosClient();

  const adapter = voltraPayloadWidget(streak, {
    sdk: fake.sdk,
    render: (props) => {
      seen.push({ days: props.days, calls: [...fake.calls] });

      return render(props);
    },
  });

  const session = await open(adapter);

  await session.publish({ days: 7 });

  expect(seen).toEqual([{ days: 7, calls: ["assertRunningOnApple"] }]);
  expect(fake.calls.at(-1)).toBe("updateWidget:StreakWidget");
});

test("an SDK call that rejects is not swallowed and not answered as a result", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("native failure");

  fake.failNext(error);

  await expect(session.publish({ days: 1 })).rejects.toBe(error);
  expect(fake.snapshot("StreakWidget")).toBeNull();
});

test("a timeline renders every entry and schedules them as dates with variants, answered as a resolved promise", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);

  const answer = await session.publishTimeline?.([
    { at: 5_000, data: { days: 1 } },
    { at: 9_000, data: { days: 2 } },
  ]);

  expect(answer).toEqual({
    status: "submitted",
    evidence: "sdk-promise-resolved",
  });
  expect(fake.calls).toEqual([
    "assertRunningOnApple",
    "scheduleWidget:StreakWidget",
  ]);
  expect(fake.timeline("StreakWidget")).toEqual([
    { date: new Date(5_000), variants: render({ days: 1 }) },
    { date: new Date(9_000), variants: render({ days: 2 }) },
  ]);
});

test("a timeline whose later entry fails to render is failed, and nothing was scheduled", async () => {
  const { fake, adapter } = create({}, throwOnThree);
  const session = await open(adapter);

  const answer = await session.publishTimeline?.([
    { at: 5_000, data: { days: 1 } },
    { at: 9_000, data: { days: 3 } },
    { at: 12_000, data: { days: 4 } },
  ]);

  expect(answer).toMatchObject({
    status: "failed",
    error: expect.objectContaining({ message: "render failure" }),
  });
  expect(fake.calls).toEqual(["assertRunningOnApple"]);
  expect(fake.timeline("StreakWidget")).toBeNull();
});

test("a timeline call that rejects is not swallowed", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("native failure");

  fake.failNext(error);

  await expect(
    session.publishTimeline?.([{ at: 0, data: { days: 1 } }]),
  ).rejects.toBe(error);
});

test("a reload request reloads this widget only, and acknowledges a resolved promise", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);

  expect(await session.reload?.()).toEqual({
    status: "submitted",
    evidence: "sdk-promise-resolved",
  });
  expect(fake.calls).toEqual([
    "assertRunningOnApple",
    "reloadWidgets:StreakWidget",
  ]);
  expect(fake.reloads).toEqual([["StreakWidget"]]);
});

test("a reload call that rejects is not swallowed", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("native failure");

  fake.failNext(error);

  await expect(session.reload?.()).rejects.toBe(error);
});

test("off Apple the adapter is unavailable with a reason and a remedy, and calls only the probe", async () => {
  const { fake, adapter } = create({ onApple: false });

  expect(await adapter.open()).toEqual({
    status: "unavailable",
    reason: expect.stringContaining("not running on an Apple platform"),
    remediation: expect.stringContaining("development build"),
  });
  expect(fake.calls).toEqual(["assertRunningOnApple"]);
});

test("an application's own availability answer replaces the probe, so the SDK is never asked", async () => {
  const fake = createFakeVoltraIosClient({ onApple: false });

  const adapter = voltraPayloadWidget(streak, {
    sdk: fake.sdk,
    render,
    available: () => false,
  });

  expect(await adapter.open()).toMatchObject({ status: "unavailable" });
  expect(fake.calls).toEqual([]);
});

test("an application that says it is Apple opens without asking the probe", async () => {
  const fake = createFakeVoltraIosClient();

  const adapter = voltraPayloadWidget(streak, {
    sdk: fake.sdk,
    render,
    available: () => true,
  });

  expect(await adapter.open()).toMatchObject({ status: "opened" });
  expect(fake.calls).toEqual([]);
});

test("through a Frame, a publication is submitted with a resolved promise, equal content is unchanged, and a rejection is indeterminate", async () => {
  const { fake, widget } = createFrame();

  expect(await widget.publish({ days: 1 })).toMatchObject({
    status: "submitted",
    kind: "snapshot",
    evidence: "sdk-promise-resolved",
  });
  expect((await widget.publish({ days: 1 })).status).toBe("unchanged");

  const error = new Error("native failure");

  fake.failNext(error);

  expect(await widget.publish({ days: 2 })).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error,
  });
  expect((await widget.publish({ days: 2 })).status).toBe("submitted");
  expect(fake.snapshot("StreakWidget")).toEqual(render({ days: 2 }));
});

test("through a Frame, a render that throws is failed and the SDK is never asked", async () => {
  const { fake, widget } = createFrame({}, throwOnThree);

  expect(await widget.publish({ days: 3 })).toMatchObject({
    status: "failed",
    error: expect.objectContaining({ message: "render failure" }),
  });
  expect(fake.calls).toEqual(["assertRunningOnApple"]);
  expect(widget.status.get().lifecycle.state).toBe("ready");
});

test("through a Frame, a timeline and a reload are submitted with a resolved promise", async () => {
  const { fake, widget } = createFrame();

  expect(
    await widget.publishTimeline([
      { at: NOW - 10, data: { days: 1 } },
      { at: NOW + 60_000, data: { days: 2 } },
    ]),
  ).toMatchObject({
    status: "submitted",
    kind: "timeline",
    evidence: "sdk-promise-resolved",
  });
  expect(fake.timeline("StreakWidget")).toEqual([
    { date: new Date(NOW - 10), variants: render({ days: 1 }) },
    { date: new Date(NOW + 60_000), variants: render({ days: 2 }) },
  ]);
  expect(await widget.reload()).toMatchObject({
    status: "submitted",
    evidence: "sdk-promise-resolved",
  });
  expect(fake.reloads.at(-1)).toEqual(["StreakWidget"]);
});

test("through a Frame, a readback answers unavailable because Voltra returns nothing it stores", async () => {
  const { widget } = createFrame();

  expect(await widget.readback()).toMatchObject({
    status: "unavailable",
    reason: "The voltra-ios adapter does not provide readback.",
  });
});

test("through a Frame, a runtime that is not Apple answers unavailable instead of a success", async () => {
  const { fake, widget } = createFrame({ onApple: false });

  const outcome = await widget.publish({ days: 1 });

  expect(outcome).toMatchObject({ status: "unavailable" });
  expect(widget.status.get().lifecycle.state).toBe("unavailable");
  expect(fake.calls).toEqual(["assertRunningOnApple"]);
  expect(fake.snapshot("StreakWidget")).toBeNull();
});

test("a render that returns a host element is rejected by the SDK, and the adapter claims nothing for it", async () => {
  const { adapter } = create({}, () => ({
    systemSmall: createElement("span", null, "x"),
  }));

  const session = await open(adapter);

  await expect(session.publish({ days: 1 })).rejects.toThrowError(
    'Host component "span" is not supported in Voltra.',
  );
});
