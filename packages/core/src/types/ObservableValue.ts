/**
 * A readable value with change notifications. `subscribe` never calls back at
 * once and answers its unsubscriber; a listener that throws stops no other,
 * and its error is rethrown in a microtask for your error reporting.
 *
 * @example
 * ```ts
 * const stop = widget.status.subscribe(() => render(widget.status.get()));
 * ```
 */
export type ObservableValue<TValue> = {
  get: () => TValue;
  subscribe: (listener: () => void) => () => void;
};
