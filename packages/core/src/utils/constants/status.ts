import type { WidgetDesired } from "src/types/WidgetDesired";
import type { WidgetLifecycle } from "src/types/WidgetLifecycle";
import type { WidgetStatus } from "src/types/WidgetStatus";

/** The lifecycle of a widget whose adapters were never asked to open, one shared frozen object so `Object.is` sees no change. */
export const IDLE_WIDGET_LIFECYCLE = Object.freeze({
  state: "idle",
} satisfies WidgetLifecycle);

/** The lifecycle of a widget whose adapters are being opened. */
export const PREPARING_WIDGET_LIFECYCLE = Object.freeze({
  state: "preparing",
} satisfies WidgetLifecycle);

/** The lifecycle of a widget hosted by an opened adapter. */
export const READY_WIDGET_LIFECYCLE = Object.freeze({
  state: "ready",
} satisfies WidgetLifecycle);

/** The lifecycle a handle reads once its context ended. */
export const RETIRED_WIDGET_LIFECYCLE = Object.freeze({
  state: "retired",
} satisfies WidgetLifecycle);

/** The lifecycle of a widget whose Frame was disposed. */
export const DISPOSED_WIDGET_LIFECYCLE = Object.freeze({
  state: "disposed",
} satisfies WidgetLifecycle);

/** What Frame wants shown before it accepted anything, and again once a context ended. */
export const ABSENT_WIDGET_DESIRED = Object.freeze({
  state: "absent",
} satisfies WidgetDesired);

/** What a widget reads as before anything happened, and on a server that never publishes. */
export const IDLE_WIDGET_STATUS = Object.freeze({
  lifecycle: IDLE_WIDGET_LIFECYCLE,
  desired: ABSENT_WIDGET_DESIRED,
  work: "idle",
  latest: null,
} satisfies WidgetStatus);
