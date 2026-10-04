import type { WidgetStatus } from "@priemskiyyy/frame";

import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useWidget } from "src/hooks/useWidget";
import type { RegisteredKey } from "src/types/Register";

// What a server render reads, so the client's first render can match it.
const IDLE_STATUS: WidgetStatus = Object.freeze({
  lifecycle: Object.freeze({ state: "idle" }),
  desired: Object.freeze({ state: "absent" }),
  work: "idle",
  latest: null,
});

/**
 * What Frame knows about a widget: its lifecycle, whether a value is wanted,
 * what it is waiting on and the last outcome. It only observes, and reads idle
 * on the server and on the hydrating render.
 *
 * @example
 * ```tsx
 * const { work, latest } = useWidgetStatus("streak");
 *
 * return <Text>{work === "idle" ? latest?.status : "Sending"}</Text>;
 * ```
 */
export const useWidgetStatus = (key: RegisteredKey): WidgetStatus => {
  const widget = useWidget(key);

  return useObservableValue(widget.status, () => IDLE_STATUS);
};
