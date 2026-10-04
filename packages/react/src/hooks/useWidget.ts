import type { WidgetHandle } from "@priemskiyyy/frame";
import { useSyncExternalStore } from "react";

import { useFrame } from "src/hooks/useFrame";
import type { RegisteredData, RegisteredKey } from "src/types/Register";

/**
 * The handle of a widget in the Frame's current context, to publish to, which
 * renders again with the new handle after `frame.context()`. It only reads the
 * handle, so it renders again for neither the data nor the status.
 *
 * @example
 * ```tsx
 * const streak = useWidget("streak");
 *
 * const handlePublishPress = () => {
 *   streak.publish({ days: 12 });
 * };
 * ```
 */
export const useWidget = <TKey extends RegisteredKey>(
  key: TKey,
): WidgetHandle<RegisteredData<TKey>> => {
  const frame = useFrame();
  const getWidget = () => frame.widget(key);
  const widget = getWidget();

  // The snapshot is the handle: a status change that keeps it renders nothing, and its retirement renders the next.
  return useSyncExternalStore(widget.status.subscribe, getWidget, getWidget);
};
