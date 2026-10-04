import type { WidgetAdapter } from "src/types/WidgetAdapter";

/**
 * How the conformance suite reaches one adapter: a fresh adapter over an
 * empty, isolated provider each time, a count of provider calls to prove that
 * creating and opening stay cold, and, where the provider can suffer them,
 * the failures the checks need.
 *
 * @example
 * ```ts
 * const harness: WidgetAdapterHarness = {
 *   name: "expo",
 *   create: () => expoWidget(streak, { sdk: fake.sdk, render }),
 *   calls: () => fake.calls.length,
 *   failNextCall: () => fake.failNext(new Error("native failure")),
 * };
 * ```
 */
export type WidgetAdapterHarness = {
  /** Names the adapter in a failing check's message. */
  name: string;
  create: () => WidgetAdapter;
  /** Provider calls made so far by the adapter `create` or `createUnavailable` returned last, creating and opening included. An SDK's own platform probe acts on no widget, so a harness may leave it out. */
  calls: () => number;
  /** Makes the provider behind the adapter `create` returned last throw on its next call. */
  failNextCall?: (() => void) | undefined;
  /** Makes an adapter that answers `unavailable` from `open`, as one on the wrong platform does, over a provider `calls` then counts. */
  createUnavailable?: (() => WidgetAdapter) | undefined;
};
