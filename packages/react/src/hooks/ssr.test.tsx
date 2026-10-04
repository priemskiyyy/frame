import type { WidgetStatus } from "@priemskiyyy/frame";
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { FrameProvider } from "src/context/FrameProvider";
import {
  createStreakFrame,
  createWatchedStreakFrame,
} from "src/hooks/hooks.fixture";
import { useWidgetData } from "src/hooks/useWidgetData";
import { useWidgetStatus } from "src/hooks/useWidgetStatus";

const View = () => {
  const data = useWidgetData("streak");
  const { lifecycle } = useWidgetStatus("streak");

  return (
    <span>{`${lifecycle.state}/${data === null ? "none" : data.days}`}</span>
  );
};

test("server rendering is inert and hydrates from the same snapshots without a mismatch", async () => {
  const { frame, control, live } = createWatchedStreakFrame();
  const onRecoverableError = vi.fn();

  const html = renderToString(
    <FrameProvider frame={frame}>
      <View />
    </FrameProvider>,
  );

  expect(html).toContain("idle/none");
  expect(live).toEqual({ data: 0, status: 0 });
  expect(control.sessions()).toBe(0);
  expect(control.calls()).toEqual([]);

  // The client published before hydrating, and its first render must still match the server's markup.
  await frame.widget("streak").publish({ days: 3 });

  const container = document.createElement("div");

  container.innerHTML = html;
  document.body.append(container);

  await act(async () => {
    hydrateRoot(
      container,
      <FrameProvider frame={frame}>
        <View />
      </FrameProvider>,
      { onRecoverableError },
    );
  });

  expect(onRecoverableError).not.toHaveBeenCalled();
  expect(container.textContent).toBe("ready/3");

  container.remove();
});

test("an unwatched Frame renders the same on the server", () => {
  const { frame } = createStreakFrame();

  expect(
    renderToString(
      <FrameProvider frame={frame}>
        <View />
      </FrameProvider>,
    ),
  ).toContain("idle/none");
});

test("a server render reads the frozen idle status of a widget nobody touched, whatever the client did", async () => {
  const { frame } = createStreakFrame();
  const untouched = createStreakFrame().frame.widget("streak").status.get();
  const seen: WidgetStatus[] = [];

  await frame.widget("streak").publish({ days: 3 });

  const Status = () => {
    seen.push(useWidgetStatus("streak"));

    return <span />;
  };

  renderToString(
    <FrameProvider frame={frame}>
      <Status />
    </FrameProvider>,
  );

  const [status] = seen;

  if (status === undefined) {
    throw new Error("The view did not render.");
  }

  expect(status).toEqual({
    lifecycle: { state: "idle" },
    desired: { state: "absent" },
    work: "idle",
    latest: null,
  });
  expect(status).toEqual(untouched);
  expect(Object.isFrozen(status)).toBe(true);
  expect(Object.isFrozen(status.lifecycle)).toBe(true);
  expect(Object.isFrozen(status.desired)).toBe(true);
});
