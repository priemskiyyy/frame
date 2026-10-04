/**
 * What this widget is waiting on, most urgent first: `blocked` when its write
 * domain took no work because a provider call never answered, `submitting`
 * while a request waits for or sits in a provider call, `validating` while a
 * schema is still answering, otherwise `idle`.
 *
 * @example
 * ```ts
 * const busy = widget.status.get().work !== "idle";
 * ```
 */
export type WidgetWork = "idle" | "validating" | "submitting" | "blocked";
