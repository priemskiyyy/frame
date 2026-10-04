import { deepFreeze } from "src/utils/common/deepFreeze";

export class WidgetRequest<TOutcome> {
  id: string;
  sequence: number;
  promise: Promise<TOutcome>;
  #settled = false;
  #resolve: (outcome: TOutcome) => void = () => {};

  constructor(sequence: number) {
    this.id = `r${sequence}`;
    this.sequence = sequence;
    this.promise = new Promise<TOutcome>((resolve) => {
      this.#resolve = resolve;
    });
  }

  isSettled = () => this.#settled;

  /** Answers whether this call settled it, so a late second answer is known to be late. */
  settle = (outcome: TOutcome) => {
    if (this.#settled) {
      return false;
    }

    this.#settled = true;

    // An answer that cannot be frozen, such as a cyclic error, is still an answer.
    try {
      this.#resolve(deepFreeze(outcome));
    } catch {
      this.#resolve(outcome);
    }

    return true;
  };
}
