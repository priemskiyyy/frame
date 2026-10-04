import type { FrameDiagnosticEvent } from "src/types/FrameDiagnosticEvent";

/** A diagnostic event before the diagnostics owner stamps its time. */
export type DiagnosticEventInput = FrameDiagnosticEvent extends infer TEvent
  ? TEvent extends FrameDiagnosticEvent
    ? Omit<TEvent, "timestamp">
    : never
  : never;
