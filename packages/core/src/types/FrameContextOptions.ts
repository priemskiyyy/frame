/**
 * How a new context starts.
 *
 * - `fallback`: every widget is replaced with its fallback before the new
 *   context publishes. Use it for anything account specific.
 * - `preserve`: widgets keep what they show. Use it only for content that is
 *   the same for every account, or when the same account signs in again.
 *
 * @example
 * ```ts
 * await frame.context({ reset: "fallback" });
 * ```
 */
export type FrameContextOptions = {
  reset: "fallback" | "preserve";
};
