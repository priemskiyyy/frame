import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import type { MockAdapterOptions } from "src/mock/types/MockAdapterOptions";
import type { FrameOptions } from "src/types/FrameOptions";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import type { StandardSchemaResult } from "src/types/StandardSchemaResult";
import { createScriptedWidget } from "src/utils/scriptedWidget.fixture";
import type { WidgetData } from "src/types/WidgetData";
import { widget } from "src/utils/widget";
import { Frame } from "src/utils/Frame";

export const StreakSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("empty") }),
  z.object({
    state: z.literal("ready"),
    days: z.number().int().nonnegative(),
    label: z.string().optional(),
  }),
]);

export const streak = widget({
  name: "StreakWidget",
  schema: StreakSchema,
  fallback: { state: "empty" },
});

export const ready = (
  days: number,
  label?: string,
): WidgetData<typeof streak> => {
  if (label === undefined) {
    return { state: "ready", days };
  }

  return { state: "ready", days, label };
};

type StreakFrameOptions = Omit<
  Partial<FrameOptions<{ streak: typeof streak }>>,
  "widgets" | "clock"
>;

/** A Frame over one mock streak widget and a test clock. */
export const createStreakFrame = (
  adapterOptions: MockAdapterOptions = {},
  frameOptions: StreakFrameOptions = {},
) => {
  const clock = createTestClock({ now: 1_000_000 });
  const { adapter, control } = createMockAdapter(streak, adapterOptions);

  const frame = new Frame({
    widgets: { streak },
    adapters: [adapter],
    clock,
    ...frameOptions,
  });

  return { frame, clock, control, widget: frame.widget("streak") };
};

/** A schema that answers its fallback at once, and every other value when the test releases it. */
export const createGatedSchema = () => {
  const gates: (() => void)[] = [];
  let armed = false;

  const schema: StandardSchema<JsonRecord, JsonRecord> = {
    "~standard": {
      version: 1,
      vendor: "gated",
      validate: (value) => {
        if (!armed) {
          return { value };
        }

        return new Promise((resolve) => {
          gates.push(() => resolve({ value }));
        });
      },
    },
  };

  return {
    schema,
    arm: () => {
      armed = true;
    },
    gates,
  };
};

/** A Frame over one mock widget whose schema answers only when the test releases it. */
export const createGatedFrame = () => {
  const { schema, arm, gates } = createGatedSchema();
  const gated = widget({ name: "GatedWidget", schema, fallback: {} });
  const { adapter, control } = createMockAdapter(gated);
  const frame = new Frame({ widgets: { gated }, adapters: [adapter] });

  return { frame, widget: frame.widget("gated"), control, arm, gates };
};

/** A Frame over one mock widget whose schema answers each value as the test scripts. */
export const createScriptedFrame = (
  answer: (value: JsonRecord) => StandardSchemaResult<JsonRecord>,
) => {
  const scripted = createScriptedWidget(answer);
  const { adapter, control } = createMockAdapter(scripted);
  const clock = createTestClock({ now: 1_000_000 });

  const frame = new Frame({
    widgets: { scripted },
    adapters: [adapter],
    clock,
  });

  return { frame, widget: frame.widget("scripted"), control };
};
