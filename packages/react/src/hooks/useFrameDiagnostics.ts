import type { FrameSnapshot } from "@priemskiyyy/frame";

import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useFrame } from "src/hooks/useFrame";
import type { RegisteredKey } from "src/types/Register";

/**
 * What Frame is doing, for a debug screen: each widget's hosting adapter,
 * lifecycle and work, without any value a widget shows. It only observes, and
 * it is not for markup a server renders.
 *
 * @example
 * ```tsx
 * const { widgets } = useFrameDiagnostics();
 *
 * return <Text>{widgets.streak.adapter?.name ?? "No adapter"}</Text>;
 * ```
 */
export const useFrameDiagnostics = (): FrameSnapshot<RegisteredKey> => {
  const { diagnostics } = useFrame();

  return useObservableValue(diagnostics, diagnostics.get);
};
