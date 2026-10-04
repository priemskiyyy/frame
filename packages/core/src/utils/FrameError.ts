import type { FrameErrorOptions } from "src/types/FrameErrorOptions";

/**
 * An error Frame itself created, with a `code` to branch on. Only
 * `INVALID_CONFIGURATION` is thrown at you; every other code arrives inside an
 * outcome or a status.
 *
 * @example
 * ```ts
 * const { lifecycle } = widget.status.get();
 * if (lifecycle.state === "failed" && lifecycle.error instanceof FrameError) {
 *   console.warn(lifecycle.error.code);
 * }
 * ```
 */
export class FrameError extends Error {
  code: FrameErrorOptions["code"];

  constructor({ code, message }: FrameErrorOptions) {
    super(message);
    this.name = "FrameError";
    this.code = code;
  }
}
