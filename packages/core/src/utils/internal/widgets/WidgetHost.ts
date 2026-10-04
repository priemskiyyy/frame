import type { Acquisition } from "src/types/internal/Acquisition";
import type { DiagnosticEventInput } from "src/types/internal/DiagnosticEventInput";
import type { Refusal } from "src/types/internal/Refusal";
import type { FrameClock } from "src/types/FrameClock";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetLifecycle } from "src/types/WidgetLifecycle";
import type { WidgetOpening } from "src/types/WidgetOpening";
import type { WidgetSession } from "src/types/WidgetSession";
import {
  DISPOSED_WIDGET_LIFECYCLE,
  IDLE_WIDGET_LIFECYCLE,
  PREPARING_WIDGET_LIFECYCLE,
  READY_WIDGET_LIFECYCLE,
} from "src/utils/constants/status";
import { Listeners } from "src/utils/common/Listeners";
import { toError } from "src/utils/internal/errors/toError";
import type { Lane } from "src/utils/internal/lanes/Lane";
import { getUnavailableAnswer } from "src/utils/internal/widgets/getUnavailableAnswer";

export class WidgetHost {
  #key: string;
  #adapters: WidgetAdapter[];
  #clock: FrameClock;
  #timeout: number;
  #acquireLane: (name: string) => Lane;
  #emit: (build: () => DiagnosticEventInput) => void;
  #lifecycle: WidgetLifecycle = IDLE_WIDGET_LIFECYCLE;
  #cached: Acquisition | null = null;
  #preparing: Promise<Acquisition> | null = null;
  #disposed = false;
  #listeners = new Listeners<() => void>();
  #cancelAsk: (() => void) | null = null;

  constructor({
    key,
    adapters,
    clock,
    timeout,
    acquireLane,
    emit,
  }: {
    key: string;
    adapters: WidgetAdapter[];
    clock: FrameClock;
    timeout: number;
    acquireLane: (name: string) => Lane;
    emit: (build: () => DiagnosticEventInput) => void;
  }) {
    this.#key = key;
    this.#adapters = adapters;
    this.#clock = clock;
    this.#timeout = timeout;
    this.#acquireLane = acquireLane;
    this.#emit = emit;

    if (adapters.length > 0) {
      return;
    }

    // With no adapter the widget is unavailable from the start, so a first render can say so.
    const answer = getUnavailableAnswer(key, []);

    this.#cached = Object.freeze({ status: "unavailable", ...answer });
    this.#lifecycle = Object.freeze({ state: "unavailable", ...answer });
  }

  getLifecycle = () => this.#lifecycle;

  getReady = () => {
    if (this.#cached === null || this.#cached.status !== "ready") {
      return null;
    }

    return this.#cached;
  };

  subscribe = this.#listeners.add;

  /** Opens the adapters once, however many ask at once; a publish keeps an unavailable answer and `retry` asks again. */
  acquire = ({ retry }: { retry: boolean }): Promise<Acquisition> => {
    if (this.#preparing !== null) {
      return this.#preparing;
    }

    const cached = this.#cached;

    if (
      cached !== null &&
      (cached.status !== "unavailable" || !retry || this.#adapters.length === 0)
    ) {
      return Promise.resolve(cached);
    }

    // Set before `#open` runs, so whoever hears its first notice and asks again finds this one.
    let answer: (acquisition: Acquisition) => void = () => {};

    const preparing = new Promise<Acquisition>((resolve) => {
      answer = resolve;
    });

    this.#preparing = preparing;
    this.#open().then((acquisition) => {
      this.#preparing = null;
      answer(acquisition);
    });

    return preparing;
  };

  dispose = () => {
    this.#disposed = true;
    this.#cancelAsk?.();

    const ready = this.getReady();

    this.#cached = { status: "disposed" };
    this.#lifecycle = DISPOSED_WIDGET_LIFECYCLE;

    if (ready === null) {
      return;
    }

    this.#release(ready.session);
  };

  #set = (lifecycle: WidgetLifecycle) => {
    this.#lifecycle = lifecycle;
    this.#listeners.notify((listener) => listener());
  };

  #open = async (): Promise<Acquisition> => {
    this.#set(PREPARING_WIDGET_LIFECYCLE);
    this.#emit(() => ({
      type: "widget-preparing",
      widget: { key: this.#key },
    }));

    const refusals: Refusal[] = [];

    try {
      for (const adapter of this.#adapters) {
        if (this.#disposed) {
          return { status: "disposed" };
        }

        const opening = await this.#ask(adapter);

        if (this.#disposed) {
          this.#releaseOpening(opening);

          return { status: "disposed" };
        }

        if (opening.status === "unavailable") {
          refusals.push({ adapter, ...opening });

          continue;
        }

        return this.#remember(
          {
            status: "ready",
            adapter: { name: adapter.name },
            session: opening.session,
            lane: this.#acquireLane(opening.session.writeDomain),
          },
          READY_WIDGET_LIFECYCLE,
          "widget-ready",
        );
      }
    } catch (error) {
      return this.#fail(toError(error));
    }

    const answer = getUnavailableAnswer(this.#key, refusals);

    return this.#remember(
      Object.freeze({ status: "unavailable", ...answer }),
      Object.freeze({ state: "unavailable", ...answer }),
      "widget-unavailable",
    );
  };

  // An answer that comes after the deadline or the disposal is released, never used.
  #ask = (adapter: WidgetAdapter) =>
    new Promise<WidgetOpening>((resolve, reject) => {
      const state = { done: false };

      const cancelTimer = this.#clock.setTimer(() => {
        state.done = true;
        reject(
          new Error(
            `The ${adapter.name} adapter did not answer open within ${this.#timeout} ms.`,
          ),
        );
      }, this.#timeout);

      this.#cancelAsk = () => {
        state.done = true;
        cancelTimer();
        reject(new Error("The Frame was disposed."));
      };

      Promise.resolve()
        .then(() => {
          if (state.done) {
            throw new Error("The Frame was disposed.");
          }

          return adapter.open();
        })
        .then(
          (opening) => {
            if (state.done) {
              this.#releaseOpening(opening);

              return;
            }

            state.done = true;
            cancelTimer();
            resolve(opening);
          },
          (error) => {
            cancelTimer();
            reject(error);
          },
        );
    });

  #releaseOpening = (opening: WidgetOpening) => {
    if (opening?.status !== "opened") {
      return;
    }

    this.#release(opening.session);
  };

  #release = (session: WidgetSession) => {
    try {
      Promise.resolve(session.dispose?.()).catch(this.#reportReleaseFailure);
    } catch {
      this.#reportReleaseFailure();
    }
  };

  #reportReleaseFailure = () => {
    this.#emit(() => ({
      type: "widget-dispose-failed",
      widget: { key: this.#key },
    }));
  };

  #remember = (
    acquisition: Acquisition,
    lifecycle: WidgetLifecycle,
    event: "widget-ready" | "widget-unavailable",
  ): Acquisition => {
    this.#cached = acquisition;
    this.#set(lifecycle);
    this.#emit(() => ({ type: event, widget: { key: this.#key } }));

    // Whoever heard the notice may have disposed the Frame, which already released the session.
    if (this.#disposed) {
      return { status: "disposed" };
    }

    return acquisition;
  };

  #fail = (error: Error): Acquisition => {
    if (this.#disposed) {
      return { status: "disposed" };
    }

    this.#cached = null;
    this.#set(Object.freeze({ state: "failed", error }));
    this.#emit(() => ({
      type: "widget-prepare-failed",
      widget: { key: this.#key },
    }));

    return { status: "failed", error };
  };
}
