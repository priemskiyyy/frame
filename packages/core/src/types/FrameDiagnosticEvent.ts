import type { RequestStatus } from "src/types/internal/RequestStatus";

/**
 * One frozen record of something Frame did. It names widgets and requests, and
 * never carries a value a widget shows, a schema message or a provider error.
 *
 * @example
 * ```ts
 * frame.diagnostics.events.subscribe((event) => {
 *   if (event.type === "request-settled") console.debug(event.request.id, event.outcome.status);
 * });
 * ```
 */
export type FrameDiagnosticEvent = {
  /** Epoch milliseconds on the Frame clock. */
  timestamp: number;
} & (
  | { type: "widget-preparing"; widget: { key: string } }
  | { type: "widget-ready"; widget: { key: string } }
  | { type: "widget-unavailable"; widget: { key: string } }
  | { type: "widget-prepare-failed"; widget: { key: string } }
  | { type: "widget-dispose-failed"; widget: { key: string } }
  | {
      type: "request-accepted";
      widget: { key: string };
      request: { id: string };
      revision: number;
    }
  | {
      type: "request-settled";
      widget: { key: string };
      request: { id: string };
      outcome: { status: RequestStatus };
    }
  | { type: "write-domain-blocked"; writeDomain: { name: string } }
  | {
      type: "write-domain-unblocked";
      writeDomain: { name: string };
      /** How the stuck call finally ended: `answered`, or `threw`. */
      result: { status: "answered" | "threw" };
    }
  | {
      type: "context-started";
      /** Counts contexts, from 1: the first starts when the Frame is made. */
      epoch: number;
      reset: "fallback" | "preserve";
    }
  | { type: "frame-disposed" }
);
