import { widget } from "@priemskiyyy/frame";
import { testWidgetAdapter } from "@priemskiyyy/frame/testing";
import { createElement } from "react";
import { expect, test } from "vitest";
import { z } from "zod";

import {
  createFakeVoltraIosClient,
  Label,
} from "src/fakeVoltraIosClient.fixture";
import { voltraPayloadWidget } from "src/voltraPayloadWidget";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const render = (props: { days: number }) => ({
  systemSmall: createElement(Label, null, props.days),
});

test("the voltra payload adapter passes the conformance suite", async () => {
  let fake = createFakeVoltraIosClient();

  const { skipped } = await testWidgetAdapter({
    name: "voltra-ios",
    create: () => {
      fake = createFakeVoltraIosClient();

      return voltraPayloadWidget(streak, { sdk: fake.sdk, render });
    },
    calls: () =>
      fake.calls.filter((call) => call !== "assertRunningOnApple").length,
    failNextCall: () => fake.failNext(new Error("native failure")),
    createUnavailable: () => {
      fake = createFakeVoltraIosClient({ onApple: false });

      return voltraPayloadWidget(streak, { sdk: fake.sdk, render });
    },
  });

  expect(skipped).toEqual([
    "a readback answers entries with an instant each, when the adapter has one",
  ]);
});
