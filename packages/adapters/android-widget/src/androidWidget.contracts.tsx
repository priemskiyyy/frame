import { Frame, widget } from "@priemskiyyy/frame";
import * as AndroidWidgets from "react-native-android-widget";
import {
  FlexWidget,
  TextWidget,
  registerWidgetTaskHandler,
} from "react-native-android-widget";
import type {
  WidgetInfo,
  WidgetRepresentation,
} from "react-native-android-widget";
import { z } from "zod";

import { androidWidget } from "src/androidWidget";
import type { AndroidWidgetsLike } from "src/types/AndroidWidgetsLike";
import type { WidgetInfoLike } from "src/types/WidgetInfoLike";
import type { WidgetRepresentationLike } from "src/types/WidgetRepresentationLike";

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

const StreakView = (data: { days: number }, placement: WidgetInfo) => (
  <FlexWidget style={{ flexDirection: "column" }}>
    <TextWidget text={`${data.days} days on ${placement.width} wide`} />
  </FlexWidget>
);

const adapter = androidWidget(streak, {
  sdk: AndroidWidgets,
  render: StreakView,
  available: () => true,
});

export const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

export type SdkFitsTheStructuralSdk = Expect<
  typeof AndroidWidgets extends AndroidWidgetsLike ? true : false
>;

export type PlacementMirrorsTheSdk = Expect<Equal<WidgetInfoLike, WidgetInfo>>;
export type RepresentationFitsTheSdk = Expect<
  WidgetRepresentationLike extends WidgetRepresentation ? true : false
>;

androidWidget(streak, {
  sdk: AndroidWidgets,
  available: () => true,
  render: (data) => ({
    light: <TextWidget text={`${data.days}`} />,
    dark: <TextWidget text={`${data.days}`} />,
  }),
});

androidWidget(streak, {
  sdk: AndroidWidgets,
  available: () => true,
  render: (data) => ({
    light: <TextWidget text={`${data.days}`} />,
    // @ts-expect-error the SDK's type allows a null dark tree, but its implementation throws on it
    dark: null,
  }),
});

// @ts-expect-error availability is the application's to answer: the SDK has no probe
androidWidget(streak, { sdk: AndroidWidgets, render: StreakView });

registerWidgetTaskHandler(async (props) => {
  const data = frame.widget("streak").get() ?? streak.fallback;

  props.renderWidget(StreakView(data, props.widgetInfo));
});

androidWidget(streak, {
  sdk: AndroidWidgets,
  // @ts-expect-error the data of the definition is what the render function receives
  render: (data: { label: string }) => <TextWidget text={data.label} />,
});

androidWidget(streak, {
  sdk: AndroidWidgets,
  // @ts-expect-error a placement is the SDK's, not a bare id
  render: (data: { days: number }, placement: { widgetId: string }) => (
    <TextWidget text={`${data.days}${placement.widgetId}`} />
  ),
});

// @ts-expect-error a render function answers a widget tree, not text
androidWidget(streak, { sdk: AndroidWidgets, render: () => "12 days" });

// @ts-expect-error an object that is not the module is refused
androidWidget(streak, { sdk: { getWidgetInfo: 1 }, render: StreakView });

const requestOnly = {
  getWidgetInfo: AndroidWidgets.getWidgetInfo,
  requestWidgetUpdate: AndroidWidgets.requestWidgetUpdate,
};

// @ts-expect-error requestWidgetUpdate does not await its renders, so the adapter needs the ById variant
androidWidget(streak, { sdk: requestOnly, render: StreakView });

// @ts-expect-error the module is required: Frame never imports it
androidWidget(streak, { render: StreakView });
