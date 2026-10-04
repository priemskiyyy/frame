/**
 * The value Frame wants shown, which can be ahead of what a provider
 * received. `origin` tells a real publication from the fallback.
 *
 * @example
 * ```ts
 * const { desired } = widget.status.get();
 * if (desired.state === "accepted") console.log(desired.revision, desired.origin);
 * ```
 */
export type WidgetDesired =
  | { state: "absent" }
  | {
      state: "accepted";
      origin: "fallback" | "publication";
      /** Counts accepted replacements of this handle, from 1. */
      revision: number;
    };
