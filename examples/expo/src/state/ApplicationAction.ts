import type { PublicationOutcome } from "@priemskiyyy/frame";

import type { AccountId } from "src/types/AccountId";
import type { Provider } from "src/types/Provider";
import type { Streak } from "src/types/Streak";

export type ApplicationAction =
  | { type: "PROVIDER_SELECTED"; provider: Provider }
  | { type: "ACCOUNT_SELECTED"; account: AccountId }
  /** Replaces the streak of whichever account is signed in. */
  | { type: "STREAK_EDITED"; streak: Streak }
  | {
      type: "OUTCOME_RECORDED";
      label: string;
      provider: Provider;
      outcome: PublicationOutcome;
      at: number;
    }
  | { type: "LEDGER_CLEARED" };
