import type { PublicationOutcome, ReloadOutcome } from "@priemskiyyy/frame";
import { match } from "ts-pattern";

/** One sentence on what Frame knows, and what it does not, for each way a request can end. */
export const explainOutcome = (outcome: PublicationOutcome | ReloadOutcome) =>
  match(outcome)
    .with({ status: "submitted" }, ({ evidence }) => {
      if (evidence === "simulated") {
        return "The simulated provider took the call. No home screen is involved, and none is claimed.";
      }

      return "The provider call returned. The home screen redraws on its own schedule, so this is not proof it has.";
    })
    .with(
      { status: "unchanged" },
      () => "Same content as the last submission, so nothing was sent.",
    )
    .with(
      { status: "superseded" },
      ({ by }) =>
        `Request ${by.id} replaced this one before it reached the provider, so it was never sent.`,
    )
    .with(
      { status: "skipped" },
      () =>
        "The provider reported no placed widget, so there was nothing to draw.",
    )
    .with(
      { status: "invalid" },
      ({ reason, issues }) =>
        `Refused before any provider call (${reason}): ${issues[0]?.message ?? "no detail"}`,
    )
    .with({ status: "unavailable" }, ({ reason }) => reason)
    .with(
      { status: "failed" },
      () =>
        "Preparing the value failed before the provider call, so nothing changed.",
    )
    .with(
      { status: "indeterminate" },
      ({ reason }) =>
        `A provider call ${reason === "timeout" ? "outlived its deadline" : "did not complete cleanly"}. The widget may or may not have changed.`,
    )
    .with(
      { status: "blocked" },
      () =>
        "An earlier call has not answered, so this write domain takes no new work.",
    )
    .with(
      { status: "expired" },
      () => "The account context ended before this reached the provider.",
    )
    .with({ status: "disposed" }, () => "Frame was disposed first.")
    .exhaustive();
