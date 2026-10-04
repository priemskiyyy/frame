import type { ReactNode } from "react";

import type { WidgetInfoLike } from "src/types/WidgetInfoLike";
import type { WidgetRepresentationLike } from "src/types/WidgetRepresentationLike";

// The SDK builds a widget tree by calling each element's type, so a host element such as a span has nothing to call.
export const Label = (props: { children?: ReactNode }) => props.children;

const assertDrawable = (representation: WidgetRepresentationLike) => {
  const trees =
    "light" in representation
      ? [representation.light, representation.dark]
      : [representation];

  for (const tree of trees) {
    if (typeof tree.type === "function") {
      continue;
    }

    throw new TypeError("jsxTree.type is not a function");
  }
};

export type FakeDraw = {
  widgetName: string;
  widgetId: number;
  representation: WidgetRepresentationLike;
};

const toInfo = (widgetName: string, widgetId: number): WidgetInfoLike => ({
  widgetName,
  widgetId,
  height: 110,
  width: 250,
  screenInfo: {
    screenHeightDp: 800,
    screenWidthDp: 400,
    density: 2.75,
    densityDpi: 440,
  },
});

// A fake of react-native-android-widget 0.22.1: requestWidgetUpdateById lists the placed widgets again, and a missing id is a silent return.
export const createFakeAndroidWidgets = ({
  placements = { StreakWidget: [7] },
}: { placements?: Record<string, number[]> } = {}) => {
  const calls: string[] = [];
  const drawn: FakeDraw[] = [];
  const placed = new Map<string, number[]>(Object.entries(placements));
  const renderFailures = new Map<number, Error>();
  const holds = new Map<number, { gate: Promise<void>; arrive: () => void }>();
  let failure: Error | null = null;

  const take = (call: string) => {
    calls.push(call);

    if (failure === null) {
      return;
    }

    const error = failure;

    failure = null;

    throw error;
  };

  const list = (widgetName: string) =>
    (placed.get(widgetName) ?? []).map((widgetId) =>
      toInfo(widgetName, widgetId),
    );

  const sdk = {
    getWidgetInfo: async (widgetName: string) => {
      take(`getWidgetInfo:${widgetName}`);

      return list(widgetName);
    },
    requestWidgetUpdateById: async (request: {
      widgetName: string;
      widgetId: number;
      renderWidget: (
        placement: WidgetInfoLike,
      ) => Promise<WidgetRepresentationLike> | WidgetRepresentationLike;
      widgetNotFound?: () => void;
    }) => {
      const { widgetName, widgetId, renderWidget, widgetNotFound } = request;

      take(`requestWidgetUpdateById:${widgetName}:${widgetId}`);

      const held = holds.get(widgetId);

      if (held !== undefined) {
        held.arrive();
        await held.gate;
      }

      const info = list(widgetName).find(
        (placement) => placement.widgetId === widgetId,
      );

      if (info === undefined) {
        widgetNotFound?.();

        return;
      }

      const representation = await renderWidget(info);
      const renderFailure = renderFailures.get(widgetId);

      if (renderFailure !== undefined) {
        throw renderFailure;
      }

      assertDrawable(representation);

      drawn.push({ widgetName, widgetId, representation });
    },
  };

  return {
    sdk,
    calls,
    drawn,
    placements: list,
    place: (widgetName: string, widgetIds: number[]) => {
      placed.set(widgetName, widgetIds);
    },
    failNext: (error: Error) => {
      failure = error;
    },
    failRender: (widgetId: number, error: Error) => {
      renderFailures.set(widgetId, error);
    },
    hold: (widgetId: number) => {
      let release = () => {};

      let arrive = () => {};

      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      const reached = new Promise<void>((resolve) => {
        arrive = resolve;
      });

      holds.set(widgetId, { gate, arrive });

      return { reached, release };
    },
  };
};
