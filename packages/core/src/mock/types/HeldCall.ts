import type { MockCall } from "src/mock/types/MockCall";

/**
 * A call a mock session is holding, for the test to finish. Finishing it after
 * Frame's deadline is how a test shows a write that lands late.
 *
 * @example
 * ```ts
 * const [held] = control.held();
 * held?.release();
 * ```
 */
export type HeldCall = {
  call: MockCall;
  /** Answers as `succeed` would, storing what the call carried. */
  release: () => void;
  /** Answers that nothing reached the provider. */
  fail: (error: Error) => void;
  /** Answers that effects are unknown, storing what the call carried when `stored` is true. */
  indeterminate: (error: Error, stored?: boolean) => void;
  /** Rejects the call, storing what it carried when `stored` is true. */
  throw: (error: Error, stored?: boolean) => void;
};
