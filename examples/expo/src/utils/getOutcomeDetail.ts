import type { PublicationOutcome } from "@priemskiyyy/frame";
import { match } from "ts-pattern";

/** The facts only some outcomes carry: a revision and the boundary a submission reached, the request that replaced this one, or what was refused. */
export const getOutcomeDetail = (outcome: PublicationOutcome) =>
  match(outcome)
    .with(
      { status: "submitted" },
      ({ revision, kind, evidence }) =>
        `revision ${revision}, ${kind}, ${evidence}`,
    )
    .with({ status: "unchanged" }, ({ revision }) => `revision ${revision}`)
    .with({ status: "superseded" }, ({ by }) => `replaced by ${by.id}`)
    .with({ status: "invalid" }, ({ issues }) =>
      issues
        .map(({ path, message }) => {
          if (path === "") {
            return message;
          }

          return `${path}: ${message}`;
        })
        .join(" / "),
    )
    .otherwise(() => null);
