import type { PublicationOutcome } from "@priemskiyyy/frame";

import type { Tone } from "src/types/Tone";

type OutcomeStatus = PublicationOutcome["status"];

/** The one word each outcome gets everywhere on the page. */
export const OUTCOME_LABELS = {
  submitted: "Submitted",
  unchanged: "Unchanged",
  superseded: "Superseded",
  skipped: "Skipped",
  invalid: "Invalid",
  unavailable: "Unavailable",
  failed: "Failed",
  indeterminate: "Indeterminate",
  blocked: "Blocked",
  expired: "Expired",
  disposed: "Disposed",
} satisfies Record<OutcomeStatus, string>;

/** How serious each outcome is: refusing bad data is Frame working, so it is a warning, not an error. */
export const OUTCOME_TONES = {
  submitted: "positive",
  unchanged: "neutral",
  superseded: "neutral",
  skipped: "warning",
  invalid: "warning",
  unavailable: "danger",
  failed: "danger",
  indeterminate: "warning",
  blocked: "warning",
  expired: "info",
  disposed: "neutral",
} satisfies Record<OutcomeStatus, Tone>;

/** The outcomes in the order the legend lists them: the happy path first, then the honest refusals. */
export const OUTCOME_ORDER = [
  "submitted",
  "unchanged",
  "superseded",
  "invalid",
  "expired",
  "skipped",
  "indeterminate",
  "blocked",
  "failed",
  "unavailable",
  "disposed",
] satisfies OutcomeStatus[];

/** What each outcome means, written once for the legend: what Frame knows, and what it does not. */
export const OUTCOME_MEANINGS = {
  submitted:
    "The adapter reached the boundary its evidence names. It never means the widget is on screen.",
  unchanged:
    "The same content was already submitted, so nothing was sent. Force it to send anyway.",
  superseded:
    "A newer request replaced this one before it reached the provider. It was never sent.",
  skipped: "The provider reported no placed widget, so nothing was drawn.",
  invalid:
    "Frame refused the value before any provider call: not plain data, over a limit, or not what the schema accepts unchanged.",
  unavailable:
    "This runtime cannot host the widget. Nothing was tried, and nothing pretended to work.",
  failed:
    "Preparing the value failed before the provider call, so the provider never heard of it.",
  indeterminate:
    "A provider call threw, rejected or outlived its deadline. The widget may or may not have changed.",
  blocked:
    "An earlier call has not answered, so its write domain takes no new work. Nothing was tried.",
  expired:
    "The account context ended before the request reached the provider, so an old account's data cannot land.",
  disposed: "Frame was disposed before the request was handled.",
} satisfies Record<OutcomeStatus, string>;
