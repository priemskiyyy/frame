/**
 * How preparing one widget ended: `unavailable` is the adapter's own answer
 * and needs a later prepare, `failed` means opening threw and the next publish
 * tries again.
 *
 * @example
 * ```ts
 * const { widgets } = await frame.prepare();
 * if (widgets.streak.status === "unavailable") console.warn(widgets.streak.reason);
 * ```
 */
export type WidgetPreparation =
  | { status: "ready" }
  | { status: "unavailable"; reason: string; remediation: string | null }
  | { status: "failed"; error: Error }
  | { status: "disposed" };
