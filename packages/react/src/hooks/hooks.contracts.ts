import { Frame, widget } from "@priemskiyyy/frame";
import type { WidgetHandle, WidgetStatus } from "@priemskiyyy/frame";
import { expectTypeOf } from "vitest";
import { z } from "zod";

import { FrameProvider } from "src/context/FrameProvider";
import { useFrame } from "src/hooks/useFrame";
import { useFrameDiagnostics } from "src/hooks/useFrameDiagnostics";
import { useWidget } from "src/hooks/useWidget";
import { useWidgetData } from "src/hooks/useWidgetData";
import { useWidgetStatus } from "src/hooks/useWidgetStatus";
import type { createStreakFrame } from "src/hooks/hooks.fixture";
import type {
  RegisteredData,
  RegisteredFrame,
  RegisteredKey,
} from "src/types/Register";

export const useTypeContracts = () => {
  expectTypeOf<RegisteredFrame>().toEqualTypeOf<
    ReturnType<typeof createStreakFrame>["frame"]
  >();
  expectTypeOf<RegisteredKey>().toEqualTypeOf<"streak">();
  expectTypeOf<RegisteredData<"streak">>().toEqualTypeOf<{ days: number }>();
  expectTypeOf(useFrame()).toEqualTypeOf<RegisteredFrame>();

  const widget = useWidget("streak");

  expectTypeOf(widget).toEqualTypeOf<WidgetHandle<{ days: number }>>();
  expectTypeOf(useWidgetData("streak")).toEqualTypeOf<{
    days: number;
  } | null>();
  expectTypeOf(useWidgetStatus("streak")).toEqualTypeOf<WidgetStatus>();
  expectTypeOf(useFrameDiagnostics().widgets).toHaveProperty("streak");
  expectTypeOf(widget.publish).parameter(0).toEqualTypeOf<{ days: number }>();

  // @ts-expect-error a widget is named by a key the Frame registered.
  useWidget("missing");
  expectTypeOf(useFrameDiagnostics().widgets).not.toHaveProperty("missing");
  // @ts-expect-error a handle is no longer what the hooks take.
  useWidgetData(widget);
};

const otherData = widget({
  name: "StreakWidget",
  schema: z.object({ label: z.string() }),
  fallback: { label: "" },
});

const sameKeyOtherData = new Frame({ widgets: { streak: otherData } });
const widened: Frame = new Frame({ widgets: {} });

export const provideFrames = (frame: RegisteredFrame) => {
  FrameProvider({ frame });

  // @ts-expect-error a Frame whose widget under the registered key has other data is not the registered one.
  FrameProvider({ frame: sameKeyOtherData });
  // @ts-expect-error a widened Frame names no widget the hooks could read.
  FrameProvider({ frame: widened });
};
