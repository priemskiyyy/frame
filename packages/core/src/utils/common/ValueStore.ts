import type { ObservableValue } from "src/types/ObservableValue";
import { Listeners } from "src/utils/common/Listeners";

export class ValueStore<TValue> {
  #snapshot: { value: TValue };
  #listeners = new Listeners<() => void>();

  constructor(initial: TValue) {
    this.#snapshot = { value: initial };
  }

  get = () => this.#snapshot.value;

  /**
   * Takes the value now, and answers what tells the listeners about it, or
   * `null` when nothing changed, so a caller can announce it after its own change.
   */
  assign = (next: TValue): (() => void) | null => {
    if (Object.is(next, this.#snapshot.value)) {
      return null;
    }

    const snapshot = { value: next };

    this.#snapshot = snapshot;

    return () => this.#announce(snapshot);
  };

  subscribe = this.#listeners.add;

  observable: ObservableValue<TValue> = Object.freeze({
    get: this.get,
    subscribe: this.subscribe,
  });

  // A value set again started its own announcement, so this one is stale.
  #announce = (snapshot: { value: TValue }) => {
    this.#listeners.notify(
      (listener) => listener(),
      () => snapshot === this.#snapshot,
    );
  };
}
