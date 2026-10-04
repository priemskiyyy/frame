/**
 * What can stop any request, whatever it asks for.
 *
 * - `unavailable`: the adapter cannot work in this runtime. Nothing was tried.
 * - `failed`: nothing was written: the app-side preparation failed, an adapter
 *   threw while opening, or a readback could not be read.
 * - `indeterminate`: a provider call threw, rejected, outlived its deadline,
 *   or was in flight at disposal. Effects may have happened, and none is
 *   assumed undone.
 * - `blocked`: an earlier provider call has not answered, so its write domain
 *   takes no new work. Nothing was tried.
 * - `expired`: the context ended while the request waited to reach the provider,
 *   or for a readback to be parsed.
 * - `disposed`: the Frame was disposed first.
 *
 * @example
 * ```ts
 * const failure: RequestFailure = { status: "blocked" };
 * ```
 */
export type RequestFailure =
  | { status: "unavailable"; reason: string; remediation: string | null }
  | { status: "failed"; error: Error }
  | {
      status: "indeterminate";
      /** What made the call uncertain: it threw, outlived the deadline, or was in flight at disposal. */
      reason: "provider-error" | "timeout" | "disposed";
      /** What the provider threw when it threw an `Error`; `null` for a timeout and a disposal. */
      error: Error | null;
    }
  | { status: "blocked" }
  | { status: "expired" }
  | { status: "disposed" };
