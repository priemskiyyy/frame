import { Frame, widget } from "@priemskiyyy/frame";
import { createTestClock, settle } from "@priemskiyyy/frame/mock";
import { createElement } from "react";
import { expect, test } from "vitest";
import { z } from "zod";

import { androidWidget } from "src/androidWidget";
import {
  createFakeAndroidWidgets,
  Label,
} from "src/fakeAndroidWidgets.fixture";
import type { AndroidLayout } from "src/types/AndroidLayout";
import type { WidgetInfoLike } from "src/types/WidgetInfoLike";
import type { WidgetRepresentationLike } from "src/types/WidgetRepresentationLike";

type Streak = { days: number };

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const create = ({
  placements,
  throws,
  available = () => true,
  answer = (data, placement) =>
    createElement(Label, null, `${data.days}:${placement.widgetId}`),
}: {
  placements?: Record<string, number[]>;
  available?: () => boolean;
  throws?: { widgetId: number; thrown: Error | string };
  answer?: (
    data: Streak,
    placement: WidgetInfoLike,
  ) => WidgetRepresentationLike;
} = {}) => {
  const fake = createFakeAndroidWidgets(
    placements === undefined ? {} : { placements },
  );

  const renders: { data: Streak; placement: WidgetInfoLike }[] = [];

  const render: AndroidLayout<Streak> = (data, placement) => {
    fake.calls.push(`render:${placement.widgetId}`);
    renders.push({ data, placement });

    if (throws?.widgetId === placement.widgetId) {
      throw throws.thrown;
    }

    return answer(data, placement);
  };

  const adapter = androidWidget(streak, {
    sdk: fake.sdk,
    render,
    available,
  });

  return { fake, renders, adapter };
};

const open = async (adapter: ReturnType<typeof create>["adapter"]) => {
  const opening = await adapter.open();

  if (opening.status !== "opened") {
    throw new Error("The adapter did not open.");
  }

  return opening.session;
};

test("creating the adapter and opening it call the SDK nothing", async () => {
  const { fake, adapter } = create();

  expect(fake.calls).toEqual([]);
  expect(await adapter.open()).toMatchObject({ status: "opened" });
  expect(fake.calls).toEqual([]);
});

test("the write domain is the native widget kind", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  expect(session.writeDomain).toBe("android-widget:StreakWidget");
});

test("an application that says Android widgets are not available here gets unavailable, and the SDK is never called", async () => {
  const { fake, adapter } = create({ available: () => false });

  expect(await adapter.open()).toMatchObject({
    status: "unavailable",
    reason: expect.stringContaining("not available here"),
    remediation: expect.stringContaining("Platform.OS"),
  });
  expect(fake.calls).toEqual([]);
});

test("availability is asked each time the adapter opens, never when it is created", async () => {
  let answers = 0;

  const { adapter } = create({
    available: () => {
      answers += 1;

      return answers > 1;
    },
  });

  expect(answers).toBe(0);
  expect((await adapter.open()).status).toBe("unavailable");
  expect((await adapter.open()).status).toBe("opened");
  expect(answers).toBe(2);
});

test("the adapter provides no operation beyond the snapshot", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  expect(session.publishTimeline).toBeUndefined();
  expect(session.reload).toBeUndefined();
  expect(session.readback).toBeUndefined();
});

test("every placement is rendered before any update call, and each is then updated by its id", async () => {
  const { fake, adapter } = create({ placements: { StreakWidget: [7, 9] } });
  const session = await open(adapter);

  await session.publish({ days: 4 });

  expect(fake.calls).toEqual([
    "getWidgetInfo:StreakWidget",
    "render:7",
    "render:9",
    "requestWidgetUpdateById:StreakWidget:7",
    "requestWidgetUpdateById:StreakWidget:9",
  ]);
});

test("render receives the published data and each placement the SDK listed", async () => {
  const { fake, renders, adapter } = create({
    placements: { StreakWidget: [7, 9] },
  });

  const session = await open(adapter);

  await session.publish({ days: 4 });

  expect(renders).toEqual(
    fake.placements("StreakWidget").map((placement) => ({
      data: { days: 4 },
      placement,
    })),
  );
});

test("each placement is drawn with what render answered for it", async () => {
  const { fake, adapter } = create({ placements: { StreakWidget: [7, 9] } });
  const session = await open(adapter);

  await session.publish({ days: 4 });

  expect(fake.drawn).toEqual([
    {
      widgetName: "StreakWidget",
      widgetId: 7,
      representation: createElement(Label, null, "4:7"),
    },
    {
      widgetName: "StreakWidget",
      widgetId: 9,
      representation: createElement(Label, null, "4:9"),
    },
  ]);
});

test("a light and dark representation reaches the SDK as it was answered", async () => {
  const representation = {
    light: createElement(Label, null, "light"),
    dark: createElement(Label, null, "dark"),
  };

  const { fake, adapter } = create({ answer: () => representation });
  const session = await open(adapter);

  await session.publish({ days: 4 });

  expect(fake.drawn[0]?.representation).toBe(representation);
});

test("a publication is answered as a returned call, never as a resolved promise", async () => {
  const { adapter } = create();
  const session = await open(adapter);

  expect(await session.publish({ days: 4 })).toEqual({
    status: "submitted",
    evidence: "sdk-call-returned",
  });
});

test("placed widgets of another kind are neither rendered nor updated", async () => {
  const { fake, renders, adapter } = create({
    placements: { StreakWidget: [7], AgendaWidget: [99] },
  });

  const session = await open(adapter);

  await session.publish({ days: 4 });

  expect(renders.map(({ placement }) => placement.widgetId)).toEqual([7]);
  expect(fake.drawn.map(({ widgetId }) => widgetId)).toEqual([7]);
});

test("no placed widget is skipped, and neither render nor any update is called", async () => {
  const { fake, adapter } = create({ placements: {} });
  const session = await open(adapter);

  expect(await session.publish({ days: 4 })).toEqual({
    status: "skipped",
    reason: "no-placements",
  });
  expect(fake.calls).toEqual(["getWidgetInfo:StreakWidget"]);
  expect(fake.drawn).toEqual([]);
});

test("a render that throws is failed with its error, and no update call was made", async () => {
  const error = new Error("render failed");

  const { fake, adapter } = create({
    placements: { StreakWidget: [7, 9] },
    throws: { widgetId: 9, thrown: error },
  });

  const session = await open(adapter);

  expect(await session.publish({ days: 4 })).toEqual({
    status: "failed",
    error,
  });
  expect(fake.calls).toEqual([
    "getWidgetInfo:StreakWidget",
    "render:7",
    "render:9",
  ]);
  expect(fake.drawn).toEqual([]);
});

test("a render that throws something that is not an Error is still failed with an Error", async () => {
  const { adapter } = create({ throws: { widgetId: 7, thrown: "boom" } });
  const session = await open(adapter);

  expect(await session.publish({ days: 4 })).toEqual({
    status: "failed",
    error: new Error("The render function threw a value that is not an Error."),
  });
});

test("an update the SDK rejects makes the publication throw its error, and the others may be drawn", async () => {
  const { fake, adapter } = create({ placements: { StreakWidget: [7, 9] } });
  const session = await open(adapter);
  const error = new Error("invalid widget tree");

  fake.failRender(9, error);

  await expect(session.publish({ days: 4 })).rejects.toBe(error);
  expect(fake.drawn.map(({ widgetId }) => widgetId)).toEqual([7]);
});

test("a rejected update does not end the publication while another update is still in flight", async () => {
  const { fake, adapter } = create({ placements: { StreakWidget: [7, 9] } });
  const session = await open(adapter);
  const error = new Error("invalid widget tree");
  const held = fake.hold(9);
  let ended = false;

  fake.failRender(7, error);

  const publishing = Promise.resolve(session.publish({ days: 4 })).then(
    () => {
      ended = true;

      return null;
    },
    (rejection) => {
      ended = true;

      return rejection;
    },
  );

  await held.reached;
  await settle();

  expect(ended).toBe(false);

  held.release();

  expect(await publishing).toBe(error);
  expect(fake.drawn.map(({ widgetId }) => widgetId)).toEqual([9]);
});

test("a listing that rejects makes the publication throw, with no render and no update", async () => {
  const { fake, adapter } = create();
  const session = await open(adapter);
  const error = new Error("module not linked");

  fake.failNext(error);

  await expect(session.publish({ days: 4 })).rejects.toBe(error);
  expect(fake.calls).toEqual(["getWidgetInfo:StreakWidget"]);
});

test("every opening is a session of its own", async () => {
  const { adapter } = create();

  expect(await open(adapter)).not.toBe(await open(adapter));
});

test("through a Frame, a publication is submitted, equal content is unchanged, and a failed listing is indeterminate", async () => {
  const { fake, adapter } = create();

  const frame = new Frame({
    widgets: { streak },
    adapters: [adapter],
    clock: createTestClock(),
  });

  const widget = frame.widget("streak");

  expect(await widget.publish({ days: 1 })).toMatchObject({
    status: "submitted",
    kind: "snapshot",
    evidence: "sdk-call-returned",
  });
  expect((await widget.publish({ days: 1 })).status).toBe("unchanged");

  const error = new Error("module not linked");

  fake.failNext(error);

  expect(await widget.publish({ days: 2 })).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error,
  });
  expect((await widget.publish({ days: 2 })).status).toBe("submitted");
});

test("through a Frame, a rejected update is indeterminate, because some placements may already be drawn", async () => {
  const { fake, adapter } = create({ placements: { StreakWidget: [7, 9] } });
  const frame = new Frame({ widgets: { streak }, adapters: [adapter] });
  const error = new Error("invalid widget tree");

  fake.failRender(9, error);

  expect(await frame.widget("streak").publish({ days: 1 })).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
    error,
  });
  expect(fake.drawn.map(({ widgetId }) => widgetId)).toEqual([7]);
});

test("through a Frame, a render that throws is failed, and nothing reached the update call", async () => {
  const error = new Error("render failed");

  const { fake, adapter } = create({
    throws: { widgetId: 7, thrown: error },
  });

  const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

  expect(await frame.widget("streak").publish({ days: 1 })).toMatchObject({
    status: "failed",
    error,
  });
  expect(fake.calls).toEqual(["getWidgetInfo:StreakWidget", "render:7"]);
});

test("through a Frame, a publication with no placed widget is skipped and sent again once one is placed", async () => {
  const { fake, adapter } = create({ placements: {} });
  const frame = new Frame({ widgets: { streak }, adapters: [adapter] });
  const widget = frame.widget("streak");

  expect(await widget.publish({ days: 1 })).toMatchObject({
    status: "skipped",
    reason: "no-placements",
  });

  fake.place("StreakWidget", [7]);

  expect(await widget.publish({ days: 1 })).toMatchObject({
    status: "submitted",
  });
  expect(fake.drawn.map(({ widgetId }) => widgetId)).toEqual([7]);
});

test("through a Frame, an operation the adapter lacks answers unavailable, and the SDK is never called", async () => {
  const { fake, adapter } = create();

  const widget = new Frame({
    widgets: { streak },
    adapters: [adapter],
  }).widget("streak");

  const timeline = await widget.publishTimeline([{ at: 0, data: { days: 1 } }]);

  const reload = await widget.reload();
  const readback = await widget.readback();

  for (const outcome of [timeline, reload, readback]) {
    expect(outcome).toMatchObject({
      status: "unavailable",
      reason: expect.stringContaining("The android-widget adapter"),
    });
  }

  expect(fake.calls).toEqual([]);
});

test("a render that returns a host element is rejected by the SDK, and the adapter claims nothing for it", async () => {
  const { adapter } = create({
    answer: () => createElement("span", null, "x"),
  });

  const session = await open(adapter);

  await expect(session.publish({ days: 1 })).rejects.toThrowError(
    "jsxTree.type is not a function",
  );
});
