import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import type { WidgetOpening } from "src/types/WidgetOpening";

/**
 * A cold description of one widget on one provider: creating one performs no
 * I/O, and the SDK behind it stays the application's. The core never branches
 * on `name`, which is for diagnostics.
 *
 * @example
 * ```ts
 * const adapter: WidgetAdapter<StreakProps, "StreakWidget"> = {
 *   name: "expo",
 *   definition: streak,
 *   open: () => ({ status: "opened", session }),
 * };
 * ```
 */
export type WidgetAdapter<
  TData extends JsonRecord = JsonRecord,
  TName extends string = string,
> = {
  /** For diagnostics only, such as `expo` or `voltra-ios`. */
  name: string;
  definition: WidgetDefinition<TName, TData>;
  /** Called when Frame prepares, and again after a failure; it answers a fresh session each time. */
  open: () => WidgetOpening<TData> | Promise<WidgetOpening<TData>>;
};
