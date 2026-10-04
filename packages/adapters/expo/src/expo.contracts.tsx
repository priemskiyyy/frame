import { Frame, widget } from "@priemskiyyy/frame";
import { Text, VStack } from "@expo/ui/swift-ui";
import * as ExpoWidgets from "expo-widgets";
import type { Widget, WidgetEnvironment } from "expo-widgets";
import { z } from "zod";

import { expoWidget } from "src/expoWidget";
import type { ExpoWidgetEnvironmentLike } from "src/types/ExpoWidgetEnvironmentLike";
import type { ExpoWidgetLike } from "src/types/ExpoWidgetLike";

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

const StreakView = (
  props: { days: number },
  environment: WidgetEnvironment<undefined>,
) => {
  "widget";

  return (
    <VStack>
      <Text>{`${props.days} ${environment.widgetFamily}`}</Text>
    </VStack>
  );
};

const adapter = expoWidget(streak, { sdk: ExpoWidgets, render: StreakView });

export const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

export type StructuralWidgetCoversTheSdkWidget = Expect<
  Equal<
    keyof ExpoWidgetLike<{ days: number }>,
    keyof Widget<{ days: number }, undefined>
  >
>;
export type SdkWidgetFitsTheStructuralWidget = Expect<
  Widget<{ days: number }, undefined> extends ExpoWidgetLike<{ days: number }>
    ? true
    : false
>;

export type EnvironmentMirrorsTheSdk = Expect<
  Equal<ExpoWidgetEnvironmentLike, WidgetEnvironment<undefined>>
>;

expoWidget(streak, {
  sdk: ExpoWidgets,
  // @ts-expect-error the data of the definition is what the render function receives
  render: (props: { label: string }) => <Text>{props.label}</Text>,
});

// @ts-expect-error an object that is not the module is refused
expoWidget(streak, { sdk: { createWidget: 1 }, render: StreakView });

// @ts-expect-error the module is required: Frame never imports it
expoWidget(streak, { render: StreakView });
