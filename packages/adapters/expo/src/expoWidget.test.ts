import { Frame, widget } from "@priemskiyyy/frame";
import { createTestClock } from "@priemskiyyy/frame/mock";
import { createElement } from "react";
import { expect, test } from "vitest";
import { z } from "zod";

import { expoWidget } from "src/expoWidget";
import { createFakeExpoWidgets } from "src/fakeExpoWidgets.fixture";
import type { ExpoLayout } from "src/types/ExpoLayout";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const render: ExpoLayout<{ days: number }> = (props) =>
  createElement("span", null, props.days);

const create = (options: Parameters<typeof createFakeExpoWidgets>[0] = {}) => {
  const fake = createFakeExpoWidgets(options);
  const adapter = expoWidget(streak, { sdk: fake.sdk, render });

  return { fake, adapter };
};

const open = async (adapter: ReturnType<typeof create>["adapter"]) => {
  const opening = await adapter.open();

  if (opening.status !== "opened") {
    throw new Error("The adapter did not open.");
  }

  return opening.session;
};

test("creating the adapter calls the module nothing, and names itself", () => {
  const { fake, adapter } = create();

  expect(fake.calls).toEqual([]);
  expect(adapter.name).toBe("expo");
  expect(adapter.definition).toBe(streak);
});

test("the module's directory is read at every opening and never when the adapter is created", async () => {
  const fake = createFakeExpoWidgets();
  let directory: string | null = null;

  const adapter = expoWidget(streak, {
    sdk: {
      get widgetsDirectory() {
        return directory;
      },
      createWidget: fake.sdk.createWidget,
    },
    render,
  });

  expect((await adapter.open()).status).toBe("unavailable");

  directory = "file:///group/ExpoWidgets/";

  expect((await adapter.open()).status).toBe("opened");
});

test("opening registers the render function with the module exactly as it was given", async () => {
  const { fake, adapter } = create();

  await open(adapter);

  expect(fake.calls).toEqual(["createWidget:StreakWidget"]);
  expect(fake.layouts.get("StreakWidget")).toBe(render);
});

test("a snapshot is the module's updateSnapshot with the data, answered as a returned call", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);

  expect(await session.publish({ days: 4 })).toEqual({
    status: "submitted",
    evidence: "sdk-call-returned",
  });
  expect(fake.calls.at(-1)).toBe("updateSnapshot:StreakWidget");
  expect(fake.stored("StreakWidget")).toEqual([
    { date: new Date(1_000), props: { days: 4 } },
  ]);
});

test("the write domain is the native widget kind", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  expect(session.writeDomain).toBe("expo:StreakWidget");
});

test("a timeline is mapped to dates and props, and replaces the schedule", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);

  const answer = await session.publishTimeline?.([
    { at: 5_000, data: { days: 1 } },
    { at: 9_000, data: { days: 2 } },
  ]);

  expect(answer).toEqual({
    status: "submitted",
    evidence: "sdk-call-returned",
  });
  expect(fake.stored("StreakWidget")).toEqual([
    { date: new Date(5_000), props: { days: 1 } },
    { date: new Date(9_000), props: { days: 2 } },
  ]);
});

test("a reload request is the module's reload, acknowledged only as a returned call", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);

  expect(await session.reload?.()).toEqual({
    status: "submitted",
    evidence: "sdk-call-returned",
  });
  expect(fake.calls.at(-1)).toBe("reload:StreakWidget");
});

test("a readback maps the stored dates back to instants", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  await session.publishTimeline?.([{ at: 5_000, data: { days: 1 } }]);

  expect(await session.readback?.()).toEqual({
    status: "read",
    entries: [{ at: 5_000, data: { days: 1 } }],
  });
});

test("a module with no App Group is unavailable with that reason, and is never asked to create a widget", async () => {
  const { fake, adapter } = create({ widgetsDirectory: null });

  expect(await adapter.open()).toMatchObject({
    status: "unavailable",
    reason: expect.stringContaining("the App Group is not configured"),
    remediation: expect.stringContaining("groupIdentifier"),
  });
  expect(fake.calls).toEqual([]);
});

test("a module with no native side is unavailable with that reason, and is never asked to create a widget", async () => {
  const { fake, adapter } = create({ widgetsDirectory: "" });

  expect(await adapter.open()).toMatchObject({
    status: "unavailable",
    reason: expect.stringContaining("no native side"),
    remediation: expect.stringContaining("development build"),
  });
  expect(fake.calls).toEqual([]);
});

const nullable = widget({
  name: "NullableWidget",
  schema: z.object({
    days: z.number(),
    label: z.string().nullable(),
    history: z.array(z.object({ at: z.number().nullable() })),
  }),
  fallback: { days: 0, label: "none", history: [] },
});

const openNullable = async () => {
  const fake = createFakeExpoWidgets();
  const opening = await expoWidget(nullable, { sdk: fake.sdk, render }).open();

  if (opening.status !== "opened") {
    throw new Error("The adapter did not open.");
  }

  return { fake, session: opening.session };
};

test("data holding null is refused as failed before the module is called, because its storage is a property list", async () => {
  const { fake, session } = await openNullable();

  const answer = await session.publish({
    days: 1,
    label: "x",
    history: [{ at: null }],
  });

  expect(answer).toMatchObject({ status: "failed" });
  expect(answer.status === "failed" && answer.error.message).toBe(
    "expo-widgets stores widget data as a property list, which cannot hold null, found at history[0].at.",
  );
  expect(fake.calls).toEqual(["createWidget:NullableWidget"]);
});

test("when data holds several nulls the first in key order is the one named", async () => {
  const { fake, session } = await openNullable();

  const answer = await session.publish({
    days: 1,
    label: null,
    history: [{ at: null }],
  });

  expect(answer.status === "failed" && answer.error.message).toBe(
    "expo-widgets stores widget data as a property list, which cannot hold null, found at label.",
  );
  expect(fake.calls).toEqual(["createWidget:NullableWidget"]);
});

test("a timeline holding null in any entry is refused whole, and nothing is scheduled", async () => {
  const { fake, session } = await openNullable();

  const answer = await session.publishTimeline?.([
    { at: 1_000, data: { days: 1, label: "x", history: [] } },
    { at: 2_000, data: { days: 2, label: null, history: [] } },
  ]);

  expect(answer).toMatchObject({ status: "failed" });
  expect(answer).toMatchObject({
    error: {
      message: expect.stringContaining("found at entries[1].data.label."),
    },
  });
  expect(fake.calls).toEqual(["createWidget:NullableWidget"]);
  expect(fake.stored("NullableWidget")).toEqual([]);
});

test("a readback the module rejects is answered failed, because a read changes nothing", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("decoding failed");

  fake.failNext(error);

  expect(await session.readback?.()).toEqual({
    status: "failed",
    error,
  });
});

test("a readback the module rejects with something that is not an Error is failed with an Error naming it", async () => {
  const fake = createFakeExpoWidgets();

  const adapter = expoWidget(streak, {
    sdk: {
      widgetsDirectory: fake.sdk.widgetsDirectory,
      createWidget: (name, layout) => ({
        ...fake.sdk.createWidget(name, layout),
        getTimeline: () => Promise.reject("decoding failed"),
      }),
    },
    render,
  });

  const answer = await (await open(adapter)).readback?.();

  expect(answer).toEqual({
    status: "failed",
    error: new Error("decoding failed"),
  });
  expect(answer?.status === "failed" && answer.error).toBeInstanceOf(Error);
});

test("a widget opened again reads back what an earlier opening stored, because storage is by name", async () => {
  const { fake, adapter } = create();

  await (await open(adapter)).publish({ days: 4 });

  expect(await (await open(adapter)).readback?.()).toMatchObject({
    status: "read",
    entries: [{ data: { days: 4 } }],
  });
  expect(fake.stored("StreakWidget")).toHaveLength(1);
});

test("a call that throws is not swallowed", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("native failure");

  fake.failNext(error);

  expect(() => session.publish({ days: 1 })).toThrowError(error);
});

test("a timeline call that throws is not swallowed", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("native failure");

  fake.failNext(error);

  expect(() =>
    session.publishTimeline?.([{ at: 0, data: { days: 1 } }]),
  ).toThrowError(error);
});

test("a reload call that throws is not swallowed", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("native failure");

  fake.failNext(error);

  expect(() => session.reload?.()).toThrowError(error);
});

test("every opening creates a widget of its own", async () => {
  const { fake, adapter } = create();

  await open(adapter);
  await open(adapter);

  expect(fake.calls).toEqual([
    "createWidget:StreakWidget",
    "createWidget:StreakWidget",
  ]);
});

test("through a Frame, a publication is submitted, equal content is unchanged, and a native failure is indeterminate", async () => {
  const { fake, adapter } = create();

  const frame = new Frame({
    widgets: { streak },
    adapters: [adapter],
    clock: createTestClock(),
  });

  const widget = frame.widget("streak");

  expect(await widget.publish({ days: 1 })).toMatchObject({
    status: "submitted",
    evidence: "sdk-call-returned",
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
});

test("through a Frame, a web or Android runtime answers unavailable instead of pretending", async () => {
  const { fake, adapter } = create({ widgetsDirectory: "" });
  const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

  const outcome = await frame.widget("streak").publish({ days: 1 });

  expect(outcome).toMatchObject({ status: "unavailable" });
  expect(frame.widget("streak").status.get().lifecycle.state).toBe(
    "unavailable",
  );
  expect(fake.calls).toEqual([]);
});
