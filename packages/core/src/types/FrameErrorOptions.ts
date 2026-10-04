import type { FrameErrorCode } from "src/types/FrameErrorCode";

/**
 * What a `FrameError` is built from: a `code` and the message that says what
 * went wrong.
 *
 * @example
 * ```ts
 * throw new FrameError({ code: "INVALID_CONFIGURATION", message: "A widget needs a name." });
 * ```
 */
export type FrameErrorOptions = {
  code: FrameErrorCode;
  message: string;
};
