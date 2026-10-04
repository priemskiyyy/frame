import type { FrameClock } from "src/types/FrameClock";

/**
 * Options of `createMockAdapter`.
 *
 * @example
 * ```ts
 * createMockAdapter(streak, { unavailable: { reason: "No widget host." } });
 * ```
 */
export type MockAdapterOptions = {
  /** Answers `unavailable` from `open`, as an adapter on the wrong platform does. */
  unavailable?:
    { reason: string; remediation?: string | undefined } | undefined;
  /** Stamps what the simulated provider stores. Without it, entries are stamped 0. */
  clock?: FrameClock | undefined;
  /** Defaults to `mock:` followed by the widget's name. */
  writeDomain?: string | undefined;
  /** How diagnostics name the adapter, so two mocks in one Frame can be told apart. Defaults to `mock`. */
  name?: string | undefined;
};
