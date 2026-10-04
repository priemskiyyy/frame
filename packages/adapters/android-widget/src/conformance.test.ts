import { widget } from "@priemskiyyy/frame";
import { testWidgetAdapter } from "@priemskiyyy/frame/testing";
import { createElement } from "react";
import { expect, test } from "vitest";
import { z } from "zod";

import { androidWidget } from "src/androidWidget";
import {
  createFakeAndroidWidgets,
  Label,
} from "src/fakeAndroidWidgets.fixture";
import type { AndroidLayout } from "src/types/AndroidLayout";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const render: AndroidLayout<{ days: number }> = (data) =>
  createElement(Label, null, data.days);

test("the android widget adapter passes the conformance suite", async () => {
  let fake = createFakeAndroidWidgets();

  const { skipped } = await testWidgetAdapter({
    name: "android-widget",
    create: () => {
      fake = createFakeAndroidWidgets();

      return androidWidget(streak, {
        sdk: fake.sdk,
        render,
        available: () => true,
      });
    },
    calls: () => fake.calls.length,
    failNextCall: () => fake.failNext(new Error("native failure")),
    createUnavailable: () => {
      fake = createFakeAndroidWidgets();

      return androidWidget(streak, {
        sdk: fake.sdk,
        render,
        available: () => false,
      });
    },
  });

  expect(skipped).toEqual([
    "a timeline is replaced whole, when the adapter has one",
    "a reload is acknowledged, when the adapter has one",
    "a readback answers entries with an instant each, when the adapter has one",
  ]);
});
