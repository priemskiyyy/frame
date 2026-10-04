import { FrameContext } from "src/context/FrameContext";
import type { FrameProviderProps } from "src/types/FrameProviderProps";
import type { RegisteredFrame } from "src/types/Register";

/**
 * Publishes one Frame to the tree below and does nothing else: whoever
 * constructed it prepares and disposes it, so mounting opens no adapter and
 * unmounting disposes nothing. Augment `Register` first, or TypeScript
 * refuses a Frame typed by its own widgets.
 *
 * @example
 * ```tsx
 * export const frame = new Frame({ widgets: { streak }, adapters });
 *
 * declare module "@priemskiyyy/frame-react" {
 *   interface Register {
 *     frame: typeof frame;
 *   }
 * }
 *
 * <FrameProvider frame={frame}>
 *   <Application />
 * </FrameProvider>
 * ```
 */
export const FrameProvider = <TFrame extends RegisteredFrame>({
  frame,
  children,
}: FrameProviderProps<TFrame>) => (
  <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
);
