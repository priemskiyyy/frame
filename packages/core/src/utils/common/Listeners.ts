import { isolate } from "src/utils/common/isolate";

export class Listeners<TListener> {
  #entries = new Set<{ listener: TListener }>();

  add = (listener: TListener) => {
    const entry = { listener };

    this.#entries.add(entry);

    return () => {
      this.#entries.delete(entry);
    };
  };

  isEmpty = () => this.#entries.size === 0;

  notify = (
    call: (listener: TListener) => void,
    isCurrent: () => boolean = () => true,
  ) => {
    for (const entry of [...this.#entries]) {
      if (!isCurrent()) {
        return;
      }

      if (!this.#entries.has(entry)) {
        continue;
      }

      isolate(() => call(entry.listener));
    }
  };
}
