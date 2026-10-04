import { settle } from "@priemskiyyy/frame/mock";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, test } from "vitest";

import { FrameProvider } from "src/context/FrameProvider";
import {
  createStreakFrame,
  createWatchedStreakFrame,
  createWrapper,
} from "src/hooks/hooks.fixture";
import { useFrame } from "src/hooks/useFrame";
import { useFrameDiagnostics } from "src/hooks/useFrameDiagnostics";
import { useWidget } from "src/hooks/useWidget";
import { useWidgetData } from "src/hooks/useWidgetData";
import { useWidgetStatus } from "src/hooks/useWidgetStatus";

afterEach(cleanup);

test("observing is passive: mounting every hook calls no provider and publishes nothing", () => {
  const { frame, control } = createStreakFrame();

  renderHook(
    () => [
      useWidget("streak"),
      useWidgetData("streak"),
      useWidgetStatus("streak"),
    ],
    { wrapper: createWrapper(frame) },
  );

  expect(control.sessions()).toBe(0);
  expect(control.calls()).toEqual([]);
  expect(frame.widget("streak").status.get().lifecycle).toEqual({
    state: "idle",
  });
});

test("useFrame is the Frame the provider was given", () => {
  const { frame } = createStreakFrame();

  const { result } = renderHook(() => useFrame(), {
    wrapper: createWrapper(frame),
  });

  expect(result.current).toBe(frame);
});

test("a hook outside a provider throws a configuration error that names the fix", () => {
  expect(() => renderHook(() => useWidget("streak"))).toThrowError(
    expect.objectContaining({
      name: "FrameError",
      code: "INVALID_CONFIGURATION",
      message: "Frame hooks must be used within a FrameProvider.",
    }),
  );
});

test("useFrameDiagnostics names the hosting adapter once it opened, and opens nothing itself", async () => {
  const { frame, control } = createStreakFrame();

  const { result } = renderHook(() => useFrameDiagnostics().widgets.streak, {
    wrapper: createWrapper(frame),
  });

  expect(result.current).toMatchObject({ adapter: null, lifecycle: "idle" });
  expect(control.sessions()).toBe(0);

  await act(async () => {
    await frame.widget("streak").publish({ days: 1 });
  });

  expect(result.current).toMatchObject({
    adapter: { name: "mock" },
    lifecycle: "ready",
  });
});

test("useWidgetData is null until a publication is accepted, then follows it", async () => {
  const { frame } = createStreakFrame();
  const widget = frame.widget("streak");

  const { result } = renderHook(() => useWidgetData("streak"), {
    wrapper: createWrapper(frame),
  });

  expect(result.current).toBeNull();

  await act(async () => {
    await widget.publish({ days: 4 });
  });

  expect(result.current).toEqual({ days: 4 });

  await act(async () => {
    await widget.reset();
  });

  expect(result.current).toEqual({ days: 0 });
});

test("useWidgetStatus follows the lifecycle, the work and the latest outcome", async () => {
  const { frame, control } = createStreakFrame();
  const widget = frame.widget("streak");

  const { result } = renderHook(() => useWidgetStatus("streak"), {
    wrapper: createWrapper(frame),
  });

  expect(result.current.lifecycle).toEqual({ state: "idle" });

  control.script({ outcome: "hold" });

  const pending = widget.publish({ days: 1 });

  await act(async () => {
    await settle();
  });

  expect(result.current.work).toBe("submitting");

  await act(async () => {
    control.held()[0]?.release();
    await pending;
  });

  expect(result.current).toMatchObject({
    lifecycle: { state: "ready" },
    work: "idle",
    latest: { status: "submitted" },
  });
});

test("a component renders once per change of what it reads, not once per notification", async () => {
  const { frame } = createStreakFrame();
  const widget = frame.widget("streak");
  let renders = 0;

  renderHook(
    () => {
      renders += 1;

      return useWidgetData("streak");
    },
    { wrapper: createWrapper(frame) },
  );

  const initial = renders;

  await act(async () => {
    await widget.publish({ days: 1 });
    await widget.publish({ days: 1 });
  });

  expect(renders - initial).toBe(1);
});

test("a component that only publishes does not render for data or status", async () => {
  const { frame } = createStreakFrame();
  let renders = 0;

  const { result } = renderHook(
    () => {
      renders += 1;

      return useWidget("streak");
    },
    { wrapper: createWrapper(frame) },
  );

  const initial = renders;

  await act(async () => {
    await result.current.publish({ days: 1 });
  });

  expect(renders).toBe(initial);
});

test("useWidget returns the same handle across renders", () => {
  const { frame } = createStreakFrame();

  const { result, rerender } = renderHook(() => useWidget("streak"), {
    wrapper: createWrapper(frame),
  });

  const first = result.current;

  rerender();

  expect(result.current).toBe(first);
  expect(first).toBe(frame.widget("streak"));
});

test("useWidget renders with the new handle after a context change, and never exposes the old account's data", async () => {
  const { frame } = createStreakFrame();

  const { result } = renderHook(
    () => ({ widget: useWidget("streak"), data: useWidgetData("streak") }),
    { wrapper: createWrapper(frame) },
  );

  await act(async () => {
    await result.current.widget.publish({ days: 9 });
  });

  expect(result.current.data).toEqual({ days: 9 });

  const old = result.current.widget;

  await act(async () => {
    await frame.context({ reset: "fallback" });
  });

  expect(result.current.widget).not.toBe(old);
  expect(result.current.widget).toBe(frame.widget("streak"));
  expect(result.current.data).toEqual({ days: 0 });
  expect(old.get()).toBeNull();
});

test("a component that only holds the handle renders with the new one after a context change", async () => {
  const { frame } = createStreakFrame();

  const { result } = renderHook(() => useWidget("streak"), {
    wrapper: createWrapper(frame),
  });

  const old = result.current;

  await act(async () => {
    await frame.context({ reset: "preserve" });
  });

  expect(result.current).not.toBe(old);
  expect(result.current).toBe(frame.widget("streak"));
});

test("giving the provider another Frame switches every hook to it", async () => {
  const first = createStreakFrame();
  const second = createStreakFrame();

  await first.frame.widget("streak").publish({ days: 1 });
  await second.frame.widget("streak").publish({ days: 2 });

  const view = render(
    <FrameProvider frame={first.frame}>
      <Days />
    </FrameProvider>,
  );

  expect(view.container.textContent).toBe("1");

  view.rerender(
    <FrameProvider frame={second.frame}>
      <Days />
    </FrameProvider>,
  );

  expect(view.container.textContent).toBe("2");
});

test("hooks stop listening when the component unmounts", () => {
  const { frame, live } = createWatchedStreakFrame();

  const view = renderHook(
    () => [useWidgetData("streak"), useWidgetStatus("streak")],
    { wrapper: createWrapper(frame) },
  );

  // Each hook also watches its handle's status to learn of retirement: two hooks, three status listeners.
  expect(live).toEqual({ data: 1, status: 3 });

  view.unmount();

  expect(live).toEqual({ data: 0, status: 0 });
});

test("Strict Mode mounts twice without duplicating subscriptions or opening an adapter", () => {
  const { frame, control, live } = createWatchedStreakFrame();

  const view = render(
    <StrictMode>
      <FrameProvider frame={frame}>
        <Lifecycle />
      </FrameProvider>
    </StrictMode>,
  );

  expect(live.status).toBe(2);
  expect(control.sessions()).toBe(0);

  view.unmount();

  expect(live.status).toBe(0);
});

const Days = () => {
  const data = useWidgetData("streak");

  return <span>{data === null ? "none" : data.days}</span>;
};

const Lifecycle = () => {
  const { lifecycle } = useWidgetStatus("streak");

  return <span>{lifecycle.state}</span>;
};
