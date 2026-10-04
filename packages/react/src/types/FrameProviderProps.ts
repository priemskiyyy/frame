import type { PropsWithChildren } from "react";

import type { ProvidableFrame } from "src/types/ProvidableFrame";
import type { RegisteredFrame } from "src/types/Register";

/**
 * The props of `FrameProvider`: the Frame it publishes and the tree that
 * reads it.
 *
 * @example
 * ```tsx
 * const props: FrameProviderProps = { frame, children: <Application /> };
 * ```
 */
export type FrameProviderProps<
  TFrame extends RegisteredFrame = RegisteredFrame,
> = PropsWithChildren<{ frame: TFrame & ProvidableFrame<TFrame> }>;
