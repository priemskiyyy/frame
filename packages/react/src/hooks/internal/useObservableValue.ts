import type { ObservableValue } from "@priemskiyyy/frame";
import { useSyncExternalStore } from "react";

/**
 * Reads an external snapshot. The server snapshot is what a render sees on the
 * server and during hydration, so both match whatever the client does next.
 *
 * @example
 * ```ts
 * const status = useObservableValue(widget.status, getServerStatus);
 * ```
 */
export const useObservableValue = <TValue>(
  value: ObservableValue<TValue>,
  getServerSnapshot: () => TValue,
) => useSyncExternalStore(value.subscribe, value.get, getServerSnapshot);
