import type { RequestFailure } from "src/types/RequestFailure";
import type { WidgetSession } from "src/types/WidgetSession";
import type { Lane } from "src/utils/internal/lanes/Lane";

/** What asking a widget's host for its opened adapter found: a session, or the failure every request that needed it ends with. */
export type Acquisition =
  | {
      status: "ready";
      adapter: { name: string };
      session: WidgetSession;
      lane: Lane;
    }
  | Extract<RequestFailure, { status: "unavailable" | "failed" | "disposed" }>;
