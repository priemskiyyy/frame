/**
 * Where a widget's adapter stands.
 *
 * - `idle`: nothing has prepared it yet.
 * - `preparing`: its adapter is opening.
 * - `ready`: its adapter opened.
 * - `unavailable`: its adapter answered that it cannot work here.
 * - `failed`: opening threw. The next `publish` or `frame.prepare()` tries again.
 * - `retired`: its context ended. A handle never comes back; ask the Frame for the new one.
 * - `disposed`: the Frame was disposed.
 *
 * @example
 * ```ts
 * const { lifecycle } = widget.status.get();
 * if (lifecycle.state === "unavailable") console.warn(lifecycle.reason, lifecycle.remediation);
 * ```
 */
export type WidgetLifecycle =
  | { state: "idle" }
  | { state: "preparing" }
  | { state: "ready" }
  | { state: "unavailable"; reason: string; remediation: string | null }
  | { state: "failed"; error: Error }
  | { state: "retired" }
  | { state: "disposed" };
