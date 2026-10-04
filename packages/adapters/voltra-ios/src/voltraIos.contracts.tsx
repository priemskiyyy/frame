import { Frame, widget } from "@priemskiyyy/frame";
import type {
  ScheduledWidgetEntry,
  WidgetFamily,
  WidgetVariants,
} from "@use-voltra/ios";
import * as VoltraClient from "@use-voltra/ios-client";
import { z } from "zod";

import type { VoltraIosClientLike } from "src/types/VoltraIosClientLike";
import type { VoltraScheduledEntry } from "src/types/VoltraScheduledEntry";
import type { VoltraWidgetFamily } from "src/types/VoltraWidgetFamily";
import type { VoltraWidgetVariants } from "src/types/VoltraWidgetVariants";
import { voltraPayloadWidget } from "src/voltraPayloadWidget";

type Equal<TLeft, TRight> =
  (<TValue>() => TValue extends TLeft ? 1 : 2) extends <
    TValue,
  >() => TValue extends TRight ? 1 : 2
    ? true
    : false;
type Expect<TAssertion extends true> = TAssertion;

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const renderStreak = (props: { days: number }): WidgetVariants => ({
  systemSmall: (
    <VoltraClient.Voltra.VStack>
      <VoltraClient.Voltra.Text>{`${props.days} days`}</VoltraClient.Voltra.Text>
    </VoltraClient.Voltra.VStack>
  ),
});

const adapter = voltraPayloadWidget(streak, {
  sdk: VoltraClient,
  render: renderStreak,
});

export const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

export type FamiliesMirrorTheSdk = Expect<
  Equal<VoltraWidgetFamily, WidgetFamily>
>;
export type VariantsMirrorTheSdk = Expect<
  Equal<VoltraWidgetVariants, WidgetVariants>
>;
export type ScheduledEntriesFitTheSdk = Expect<
  VoltraScheduledEntry extends ScheduledWidgetEntry ? true : false
>;
export type ScheduledEntriesAreWhatTheSdkSchedules = Expect<
  Equal<
    Parameters<typeof VoltraClient.scheduleWidget>[1][number]["date"],
    VoltraScheduledEntry["date"]
  >
>;

export type ModuleFitsTheStructuralClient = Expect<
  typeof VoltraClient extends VoltraIosClientLike ? true : false
>;

voltraPayloadWidget(streak, {
  sdk: VoltraClient,
  // @ts-expect-error the data of the definition is what the render function receives
  render: (props: { label: string }) => ({
    systemSmall: (
      <VoltraClient.Voltra.Text>{props.label}</VoltraClient.Voltra.Text>
    ),
  }),
});

voltraPayloadWidget(streak, {
  sdk: VoltraClient,
  // @ts-expect-error a render function answers variants, not a bare element
  render: () => <VoltraClient.Voltra.Text>12</VoltraClient.Voltra.Text>,
});

// @ts-expect-error an object that is not the module is refused
voltraPayloadWidget(streak, { sdk: { updateWidget: 1 }, render: renderStreak });

voltraPayloadWidget(streak, {
  // @ts-expect-error without assertRunningOnApple a runtime off Apple could not be told from a success
  sdk: {
    updateWidget: VoltraClient.updateWidget,
    scheduleWidget: VoltraClient.scheduleWidget,
    reloadWidgets: VoltraClient.reloadWidgets,
  },
  render: renderStreak,
});

// @ts-expect-error the module is required: Frame never imports it
voltraPayloadWidget(streak, { render: renderStreak });
