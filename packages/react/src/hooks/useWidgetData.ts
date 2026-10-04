import type { ObservableValue } from "@priemskiyyy/frame";

import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useWidget } from "src/hooks/useWidget";
import type { RegisteredData, RegisteredKey } from "src/types/Register";

/**
 * The value a widget should show: what `widget.get()` returns, which is `null`
 * before anything is accepted and on the server. It only observes, and follows
 * the handle of the current context.
 *
 * @example
 * ```tsx
 * const streak = useWidgetData("streak");
 *
 * return <Text>{streak === null ? "Nothing shown yet" : `${streak.days} days`}</Text>;
 * ```
 */
export const useWidgetData = <TKey extends RegisteredKey>(
  key: TKey,
): RegisteredData<TKey> | null => {
  const widget: ObservableValue<RegisteredData<TKey> | null> = useWidget(key);

  return useObservableValue(widget, () => null);
};
