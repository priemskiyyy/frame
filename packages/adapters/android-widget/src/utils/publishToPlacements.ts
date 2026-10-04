import type { JsonRecord, SubmissionResult } from "@priemskiyyy/frame/adapter";

import type { AndroidLayout } from "src/types/AndroidLayout";
import type { AndroidWidgetsLike } from "src/types/AndroidWidgetsLike";
import { attemptRender } from "src/utils/attemptRender";

export const publishToPlacements = async <TData extends JsonRecord>(request: {
  sdk: AndroidWidgetsLike;
  name: string;
  render: AndroidLayout<TData>;
  data: TData;
}): Promise<SubmissionResult> => {
  const { sdk, name, render, data } = request;
  const placements = await sdk.getWidgetInfo(name);

  if (placements.length === 0) {
    return { status: "skipped", reason: "no-placements" };
  }

  const attempt = attemptRender(() =>
    placements.map((placement) => ({
      placement,
      representation: render(data, placement),
    })),
  );

  if (attempt.status === "failed") {
    return attempt;
  }

  // requestWidgetUpdate (0.22.1) never awaits its renders, so only the ById variant reports a render failure; allSettled, not all, because a rejection must not end the call while other draws are in flight.
  const settled = await Promise.allSettled(
    attempt.rendered.map(({ placement, representation }) =>
      sdk.requestWidgetUpdateById({
        widgetName: name,
        widgetId: placement.widgetId,
        renderWidget: () => representation,
      }),
    ),
  );

  const rejection = settled.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (rejection !== undefined) {
    throw rejection.reason;
  }

  return { status: "submitted", evidence: "sdk-call-returned" };
};
