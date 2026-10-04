import { FrameError } from "@priemskiyyy/frame";
import { useContext } from "react";

import { FrameContext } from "src/context/FrameContext";
import type { RegisteredFrame } from "src/types/Register";

/**
 * The nearest provider's Frame, typed by `Register`, to change its context or
 * read its diagnostics. It opens nothing, and throws when there is no
 * provider.
 *
 * @example
 * ```tsx
 * const frame = useFrame();
 *
 * const handleSignOutPress = () => {
 *   frame.context({ reset: "fallback" });
 * };
 * ```
 */
export const useFrame = (): RegisteredFrame => {
  const frame = useContext(FrameContext);

  if (frame === undefined) {
    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: "Frame hooks must be used within a FrameProvider.",
    });
  }

  return frame;
};
