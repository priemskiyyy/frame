import { match } from "ts-pattern";

import type { ApplicationAction } from "src/state/ApplicationAction";
import type { ApplicationState } from "src/state/ApplicationState";
import { LEDGER_CAPACITY } from "src/utils/constants/ledger";

export const applicationReducer = (
  state: ApplicationState,
  action: ApplicationAction,
): ApplicationState =>
  match(action)
    .with({ type: "PROVIDER_SELECTED" }, ({ provider }) => ({
      ...state,
      provider,
    }))
    .with({ type: "ACCOUNT_SELECTED" }, ({ account }) => ({
      ...state,
      account,
    }))
    .with({ type: "STREAK_EDITED" }, ({ streak }) => ({
      ...state,
      streaks: { ...state.streaks, [state.account]: streak },
    }))
    .with({ type: "OUTCOME_RECORDED" }, ({ label, provider, outcome, at }) => ({
      ...state,
      recorded: state.recorded + 1,
      milestones: {
        published: state.milestones.published || outcome.status === "submitted",
        refused:
          state.milestones.refused ||
          outcome.status === "invalid" ||
          outcome.status === "superseded",
        fenced: state.milestones.fenced || outcome.status === "expired",
      },
      ledger: [
        { id: state.recorded + 1, label, provider, outcome, at },
        ...state.ledger,
      ].slice(0, LEDGER_CAPACITY),
    }))
    .with({ type: "LEDGER_CLEARED" }, () => ({ ...state, ledger: [] }))
    .exhaustive();
