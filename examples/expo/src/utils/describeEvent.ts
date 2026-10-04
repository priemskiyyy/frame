import type { FrameDiagnosticEvent } from "@priemskiyyy/frame";
import { match } from "ts-pattern";

import type { Tone } from "src/types/Tone";

type Description = { label: string; detail: string; tone: Tone };

const describe = (label: string, detail: string, tone: Tone): Description => ({
  label,
  detail,
  tone,
});

/** One line for each thing Frame reports: a name, the facts it carries, and how loud it is. */
export const describeEvent = (event: FrameDiagnosticEvent) =>
  match(event)
    .with({ type: "widget-preparing" }, ({ widget }) =>
      describe(
        "Opening",
        `${widget.key}: asking the adapter to open`,
        "neutral",
      ),
    )
    .with({ type: "widget-ready" }, ({ widget }) =>
      describe("Ready", `${widget.key}: the adapter opened`, "positive"),
    )
    .with({ type: "widget-unavailable" }, ({ widget }) =>
      describe(
        "Unavailable",
        `${widget.key}: this runtime cannot host it`,
        "danger",
      ),
    )
    .with({ type: "widget-prepare-failed" }, ({ widget }) =>
      describe(
        "Open failed",
        `${widget.key}: opening threw, the next publish tries again`,
        "danger",
      ),
    )
    .with({ type: "widget-dispose-failed" }, ({ widget }) =>
      describe(
        "Release failed",
        `${widget.key}: the provider threw while its session was taken back`,
        "warning",
      ),
    )
    .with({ type: "request-accepted" }, ({ request, revision }) =>
      describe(
        "Accepted",
        `${request.id} is the wanted value, revision ${revision}`,
        "info",
      ),
    )
    .with({ type: "request-settled" }, ({ request, outcome }) =>
      describe("Settled", `${request.id} ended ${outcome.status}`, "neutral"),
    )
    .with({ type: "write-domain-blocked" }, ({ writeDomain }) =>
      describe(
        "Blocked",
        `${writeDomain.name} takes no new work until a stuck call answers`,
        "warning",
      ),
    )
    .with({ type: "write-domain-unblocked" }, ({ writeDomain, result }) =>
      describe(
        "Unblocked",
        `${writeDomain.name} reopened: the stuck call ${result.status}`,
        "info",
      ),
    )
    .with({ type: "context-started" }, ({ epoch, reset }) =>
      describe("New context", `epoch ${epoch}, reset ${reset}`, "info"),
    )
    .with({ type: "frame-disposed" }, () =>
      describe("Disposed", "Frame stopped accepting work", "neutral"),
    )
    .exhaustive();
