/**
 * What went wrong, for an error Frame itself created.
 *
 * - `INVALID_CONFIGURATION`: a definition, options or a lookup that cannot
 *   work, such as an invalid name, a fallback the schema rejects, or an
 *   unknown widget key. It is the only code ever thrown at you.
 * - `INVALID_ANSWER`: an adapter answered outside its contract. It arrives as
 *   the `error` of an outcome.
 * - `PROVIDER_FAILED`: a provider threw something that is not an `Error`. It
 *   arrives as the `error` of an outcome.
 *
 * @example
 * ```ts
 * const code: FrameErrorCode = "INVALID_CONFIGURATION";
 * ```
 */
export type FrameErrorCode =
  "INVALID_CONFIGURATION" | "INVALID_ANSWER" | "PROVIDER_FAILED";
