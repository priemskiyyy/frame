import type { DiagnosticEventInput } from "src/types/internal/DiagnosticEventInput";
import type { FrameClock } from "src/types/FrameClock";
import type { FrameDiagnosticEvent } from "src/types/FrameDiagnosticEvent";
import type { FrameDiagnostics } from "src/types/FrameDiagnostics";
import type { FrameSnapshot } from "src/types/FrameSnapshot";
import { Listeners } from "src/utils/common/Listeners";
import { deepFreeze } from "src/utils/common/deepFreeze";

export class Diagnostics<TKey extends string> {
  #clock: FrameClock;
  #getSnapshot: () => FrameSnapshot<TKey>;
  #snapshot: FrameSnapshot<TKey> | null = null;
  #subscribers = new Listeners<() => void>();
  #listeners = new Listeners<(event: FrameDiagnosticEvent) => void>();

  constructor({
    clock,
    getSnapshot,
  }: {
    clock: FrameClock;
    getSnapshot: () => FrameSnapshot<TKey>;
  }) {
    this.#clock = clock;
    this.#getSnapshot = getSnapshot;
  }

  /** Forgets the snapshot without telling anyone, for a change whose notice waits its turn. */
  drop = () => {
    this.#snapshot = null;
  };

  invalidate = () => {
    this.#snapshot = null;
    this.#subscribers.notify((subscriber) => subscriber());
  };

  emit = (build: () => DiagnosticEventInput) => {
    if (this.#listeners.isEmpty()) {
      return;
    }

    let event: FrameDiagnosticEvent;

    // A clock that throws must not wedge whoever is being observed.
    try {
      event = deepFreeze({ timestamp: this.#clock.now(), ...build() });
    } catch {
      return;
    }

    this.#listeners.notify((listener) => listener(event));
  };

  #get = () => {
    if (this.#snapshot === null) {
      this.#snapshot = deepFreeze(this.#getSnapshot());
    }

    return this.#snapshot;
  };

  view: FrameDiagnostics<TKey> = Object.freeze({
    get: this.#get,
    subscribe: this.#subscribers.add,
    events: Object.freeze({ subscribe: this.#listeners.add }),
  });
}
