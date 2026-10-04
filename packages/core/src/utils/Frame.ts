import type { FrameClock } from "src/types/FrameClock";
import type { FrameContextOptions } from "src/types/FrameContextOptions";
import type { FrameContextReport } from "src/types/FrameContextReport";
import type { FrameDiagnostics } from "src/types/FrameDiagnostics";
import type { FrameLimits } from "src/types/FrameLimits";
import type { FrameOptions } from "src/types/FrameOptions";
import type { FramePrepareReport } from "src/types/FramePrepareReport";
import type { FrameSnapshot } from "src/types/FrameSnapshot";
import type { PublicationOutcome } from "src/types/PublicationOutcome";
import type { ResolvedWidget } from "src/types/internal/ResolvedWidget";
import type { WidgetData } from "src/types/WidgetData";
import type { WidgetHandle } from "src/types/WidgetHandle";
import type { WidgetKey } from "src/types/WidgetKey";
import type { WidgetPreparation } from "src/types/WidgetPreparation";
import type { WidgetSummary } from "src/types/WidgetSummary";
import type { Widgets } from "src/types/Widgets";
import { createSystemClock } from "src/utils/internal/clock/createSystemClock";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { Lane } from "src/utils/internal/lanes/Lane";
import { deepFreeze } from "src/utils/common/deepFreeze";
import { resolveAdapters } from "src/utils/internal/options/resolveAdapters";
import { resolveFallbacks } from "src/utils/internal/options/resolveFallbacks";
import { resolveLimits } from "src/utils/internal/options/resolveLimits";
import { resolveTimeout } from "src/utils/internal/options/resolveTimeout";
import { typeHandle } from "src/utils/internal/widgets/typeHandle";
import { typeRecord } from "src/utils/internal/widgets/typeRecord";
import { WidgetHost } from "src/utils/internal/widgets/WidgetHost";
import { WidgetRuntime } from "src/utils/internal/widgets/WidgetRuntime";
import { FrameError } from "src/utils/FrameError";

/**
 * Owns an application's widgets: each one's definition and adapters, the order
 * in which its writes reach the provider, what it is known to show, and the
 * boundary between one account's data and the next. Constructing one calls no
 * provider; `prepare()` or the first `publish` opens the adapters.
 *
 * @example
 * ```ts
 * const frame = new Frame({
 *   widgets: { streak },
 *   adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
 * });
 * const widget = frame.widget("streak");
 * const outcome = await widget.publish({ days: 12 });
 * ```
 */
export class Frame<TWidgets extends Widgets = Widgets> {
  #clock: FrameClock;
  #limits: FrameLimits;
  #timeout: number;
  #entries: (Omit<ResolvedWidget, "adapters"> & { host: WidgetHost })[];
  #runtimes = new Map<string, WidgetRuntime>();
  #lanes = new Map<string, Lane>();
  #sequence = 0;
  #epoch = 0;
  #disposed = false;
  #diagnostics: Diagnostics<WidgetKey<TWidgets>>;

  /**
   * What Frame is doing, for logs and devtools, without a value a widget
   * shows. Observing it calls no provider.
   *
   * @example
   * ```ts
   * const { widgets } = frame.diagnostics.get();
   * ```
   */
  diagnostics: FrameDiagnostics<WidgetKey<TWidgets>>;

  constructor({
    widgets,
    adapters = [],
    timeout,
    limits,
    clock,
  }: FrameOptions<TWidgets>) {
    this.#clock = clock ?? createSystemClock();
    this.#diagnostics = new Diagnostics<WidgetKey<TWidgets>>({
      clock: this.#clock,
      getSnapshot: () => this.#inspect(),
    });
    this.diagnostics = this.#diagnostics.view;
    this.#limits = resolveLimits(limits);
    this.#timeout = resolveTimeout(timeout);
    this.#entries = resolveAdapters(
      resolveFallbacks(widgets, this.#limits),
      adapters,
    ).map(({ adapters: hosting, ...entry }) => ({
      ...entry,
      host: new WidgetHost({
        key: entry.key,
        adapters: hosting,
        clock: this.#clock,
        timeout: this.#timeout,
        acquireLane: this.#acquireLane,
        emit: this.#diagnostics.emit,
      }),
    }));

    this.#swapContext();
  }

  /**
   * One widget in the current context. A key that was never registered is a
   * type error, and throws `INVALID_CONFIGURATION` for a caller the types
   * missed. Reading a handle calls no provider.
   *
   * @example
   * ```ts
   * const widget = frame.widget("streak");
   * ```
   */
  widget = <TKey extends WidgetKey<TWidgets>>(
    key: TKey,
  ): WidgetHandle<WidgetData<TWidgets[TKey]>> => {
    const runtime = this.#runtimes.get(key);

    if (runtime === undefined) {
      throw new FrameError({
        code: "INVALID_CONFIGURATION",
        message: `Frame has no widget named "${key}".`,
      });
    }

    return typeHandle<WidgetData<TWidgets[TKey]>>(runtime.handle);
  };

  /**
   * Opens every widget's adapters now instead of at the first publish, and
   * says which widgets are ready, which cannot work here and which failed to
   * open. Preparing again after an unavailable or failed answer asks the
   * adapters again.
   *
   * @example
   * ```ts
   * const { widgets } = await frame.prepare();
   * ```
   */
  prepare = async (): Promise<FramePrepareReport<TWidgets>> => {
    const entries = await Promise.all(
      this.#entries.map(
        async (entry) =>
          [
            entry.key,
            this.#getPreparation(await entry.host.acquire({ retry: true })),
          ] satisfies [string, WidgetPreparation],
      ),
    );

    return deepFreeze({
      widgets: typeRecord<WidgetKey<TWidgets>, WidgetPreparation>(entries),
    });
  };

  /**
   * Starts a new context: the account changed, or signed out. Every handle of
   * the old context stops at once and never follows the new one, and a
   * request of it that has not reached the provider is dropped. With
   * `reset: "fallback"` every widget is replaced with its fallback before
   * this resolves, behind any call still in flight.
   *
   * @example
   * ```ts
   * await frame.context({ reset: "fallback" });
   * const widget = frame.widget("streak");
   * ```
   */
  context = async (
    options?: FrameContextOptions,
  ): Promise<FrameContextReport<TWidgets>> => {
    const reset = options?.reset ?? "fallback";

    if (this.#disposed) {
      return deepFreeze({ widgets: {} });
    }

    const { retiring, next } = this.#swapContext();
    const epoch = this.#epoch;

    // Asked before the old handles end, so it is the first request of the new context.
    const resets =
      reset === "fallback"
        ? [...next].map(
            ([key, runtime]) =>
              [key, runtime.reset()] satisfies [
                string,
                Promise<PublicationOutcome>,
              ],
          )
        : [];

    this.#retire(retiring);

    if (!this.#disposed) {
      this.#diagnostics.emit(() => ({ type: "context-started", epoch, reset }));
    }

    const entries = await Promise.all(
      resets.map(async (reset) => {
        const [key, outcome] = reset;

        return [key, await outcome] satisfies [string, PublicationOutcome];
      }),
    );

    return deepFreeze({
      widgets: typeRecord<WidgetKey<TWidgets>, PublicationOutcome>(entries),
    });
  };

  /**
   * Stops accepting work, synchronously: waiting requests end `disposed`, a
   * call in flight ends `indeterminate`, and every opened adapter is
   * released. It never removes an installed widget or closes an SDK. Calling it
   * again does nothing.
   *
   * @example
   * ```ts
   * frame.dispose();
   * ```
   */
  dispose = () => {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;

    for (const { host } of this.#entries) {
      host.dispose();
    }

    for (const runtime of this.#runtimes.values()) {
      runtime.dispose();
    }

    for (const lane of this.#lanes.values()) {
      lane.dispose();
    }

    this.#diagnostics.drop();
    this.#diagnostics.emit(() => ({ type: "frame-disposed" }));
    this.#diagnostics.invalidate();
  };

  #getPreparation = (
    acquisition: Awaited<ReturnType<WidgetHost["acquire"]>>,
  ): WidgetPreparation => {
    if (acquisition.status === "ready") {
      return { status: "ready" };
    }

    return acquisition;
  };

  #acquireLane = (name: string) => {
    const existing = this.#lanes.get(name);

    if (existing !== undefined) {
      return existing;
    }

    const lane = new Lane({
      name,
      clock: this.#clock,
      timeout: this.#timeout,
      emit: this.#diagnostics.emit,
    });

    this.#lanes.set(name, lane);

    return lane;
  };

  // Made before any old handle ends, so whoever hears a retirement is already given its replacement.
  #swapContext = () => {
    const retiring = [...this.#runtimes.values()];
    const next = new Map<string, WidgetRuntime>();

    this.#epoch += 1;

    for (const { key, definition, host, fallback } of this.#entries) {
      next.set(
        key,
        new WidgetRuntime({
          key,
          definition,
          host,
          fallback,
          clock: this.#clock,
          timeout: this.#timeout,
          limits: this.#limits,
          nextRequest: this.#nextRequest,
          emit: this.#diagnostics.emit,
          onChange: this.#diagnostics.invalidate,
          onAssign: this.#diagnostics.drop,
        }),
      );
    }

    this.#runtimes = next;

    return { retiring, next };
  };

  #retire = (retiring: WidgetRuntime[]) => {
    for (const runtime of retiring) {
      runtime.retire();
    }

    this.#diagnostics.invalidate();
  };

  #nextRequest = () => {
    this.#sequence += 1;

    return this.#sequence;
  };

  #inspect = (): FrameSnapshot<WidgetKey<TWidgets>> => ({
    state: this.#disposed ? "disposed" : "active",
    epoch: this.#epoch,
    widgets: typeRecord<WidgetKey<TWidgets>, WidgetSummary>(
      [...this.#runtimes].map(([key, runtime]) => [key, runtime.summarize()]),
    ),
  });
}
