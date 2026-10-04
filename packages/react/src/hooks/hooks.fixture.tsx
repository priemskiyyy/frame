import { Frame, widget } from "@priemskiyyy/frame";
import type { WidgetData, WidgetHandle } from "@priemskiyyy/frame";
import { createMockAdapter, createTestClock } from "@priemskiyyy/frame/mock";
import type { PropsWithChildren } from "react";
import { z } from "zod";

import { FrameProvider } from "src/context/FrameProvider";
import type { RegisteredFrame } from "src/types/Register";

export const StreakSchema = z.object({
  days: z.number().int().nonnegative(),
});

export const streak = widget({
  name: "StreakWidget",
  schema: StreakSchema,
  fallback: { days: 0 },
});

type StreakData = WidgetData<typeof streak>;

export const createStreakFrame = () => {
  const { adapter, control } = createMockAdapter(streak);

  const frame = new Frame({
    widgets: { streak },
    adapters: [adapter],
    clock: createTestClock(),
  });

  return { frame, control };
};

export const createWrapper =
  (frame: RegisteredFrame) =>
  ({ children }: PropsWithChildren) => (
    <FrameProvider frame={frame}>{children}</FrameProvider>
  );

export const createWatchedStreakFrame = () => {
  const { frame, control } = createStreakFrame();
  const live = { data: 0, status: 0 };
  const watched = new Map<WidgetHandle<StreakData>, WidgetHandle<StreakData>>();

  const watch = (handle: WidgetHandle<StreakData>) => {
    const known = watched.get(handle);

    if (known !== undefined) {
      return known;
    }

    const next: WidgetHandle<StreakData> = {
      ...handle,
      subscribe: (listener) => {
        live.data += 1;

        const stop = handle.subscribe(listener);

        return () => {
          live.data -= 1;
          stop();
        };
      },
      status: {
        get: handle.status.get,
        subscribe: (listener) => {
          live.status += 1;

          const stop = handle.status.subscribe(listener);

          return () => {
            live.status -= 1;
            stop();
          };
        },
      },
    };

    watched.set(handle, next);

    return next;
  };

  // Every other member is an arrow field closing over the real Frame, so the proxy reaches nothing private.
  const watchedFrame = new Proxy(frame, {
    get: (target, property) => {
      if (property !== "widget") {
        return Reflect.get(target, property);
      }

      return (key: "streak") => watch(target.widget(key));
    },
  });

  return { frame: watchedFrame, control, live };
};
