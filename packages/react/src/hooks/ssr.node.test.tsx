// @vitest-environment node
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { FrameProvider } from "src/context/FrameProvider";
import { createStreakFrame } from "src/hooks/hooks.fixture";
import { useFrameDiagnostics } from "src/hooks/useFrameDiagnostics";
import { useWidgetData } from "src/hooks/useWidgetData";
import { useWidgetStatus } from "src/hooks/useWidgetStatus";

const View = () => {
  const data = useWidgetData("streak");
  const { lifecycle, work } = useWidgetStatus("streak");
  const { widgets } = useFrameDiagnostics();

  return (
    <span>{`${lifecycle.state}/${work}/${data === null ? "none" : data.days}/${widgets.streak.lifecycle}`}</span>
  );
};

test("every hook renders on a server with no DOM at all, and opens nothing", () => {
  const { frame, control } = createStreakFrame();

  expect(typeof window).toBe("undefined");
  expect(
    renderToString(
      <FrameProvider frame={frame}>
        <View />
      </FrameProvider>,
    ),
  ).toContain("idle/idle/none/idle");
  expect(control.sessions()).toBe(0);
  expect(control.calls()).toEqual([]);
});
