import type { FrameDiagnosticEvent } from "src/types/FrameDiagnosticEvent";
import type { FrameSnapshot } from "src/types/FrameSnapshot";
import type { ObservableValue } from "src/types/ObservableValue";

/**
 * A passive view for logs and devtools: the current snapshot as an
 * observable, and a stream of events that never replays. Observing either
 * calls no provider, and events are only built while someone listens.
 *
 * @example
 * ```ts
 * const stop = frame.diagnostics.events.subscribe((event) => console.debug(event.type));
 * ```
 */
export type FrameDiagnostics<TKey extends string = string> = ObservableValue<
  FrameSnapshot<TKey>
> & {
  events: {
    subscribe: (listener: (event: FrameDiagnosticEvent) => void) => () => void;
  };
};
