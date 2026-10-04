import { widget } from "@priemskiyyy/frame";
import { testWidgetAdapter } from "@priemskiyyy/frame/testing";
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

test("the expo adapter passes the conformance suite", async () => {
  let fake = createFakeExpoWidgets();

  const { skipped } = await testWidgetAdapter({
    name: "expo",
    create: () => {
      fake = createFakeExpoWidgets();

      return expoWidget(streak, { sdk: fake.sdk, render });
    },
    calls: () => fake.calls.length,
    failNextCall: () => fake.failNext(new Error("native failure")),
    createUnavailable: () => {
      fake = createFakeExpoWidgets({ widgetsDirectory: "" });

      return expoWidget(streak, { sdk: fake.sdk, render });
    },
  });

  expect(skipped).toEqual([]);
});
