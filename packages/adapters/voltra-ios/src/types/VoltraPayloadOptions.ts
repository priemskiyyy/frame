import type { JsonRecord } from "@priemskiyyy/frame/adapter";

import type { VoltraIosClientLike } from "src/types/VoltraIosClientLike";
import type { VoltraLayout } from "src/types/VoltraLayout";

/**
 * Options of `voltraPayloadWidget`.
 *
 * @example
 * ```ts
 * const options: VoltraPayloadOptions<StreakProps> = { sdk: VoltraClient, render };
 * ```
 */
export type VoltraPayloadOptions<TData extends JsonRecord> = {
  /** The `@use-voltra/ios-client` module the application imported. Frame never configures it. */
  sdk: VoltraIosClientLike;
  /** Builds the Voltra JSX from the data. It runs before every SDK call, and a throw is answered `failed`. */
  render: VoltraLayout<TData>;
  /**
   * Whether this runtime is Apple, asked each time Frame opens the adapter.
   * Defaults to the SDK's own `assertRunningOnApple`, which logs a console
   * error every time it answers no. When a Frame lists other adapters for
   * other platforms, answer quietly instead, such as `() => Platform.OS === "ios"`.
   */
  available?: (() => boolean) | undefined;
};
