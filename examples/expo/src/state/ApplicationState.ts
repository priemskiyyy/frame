import type { AccountId } from "src/types/AccountId";
import type { LedgerEntry } from "src/types/LedgerEntry";
import type { Provider } from "src/types/Provider";
import type { Streak } from "src/types/Streak";

export type ApplicationState = {
  provider: Provider;
  account: AccountId;
  /** The app's own data, one streak per account: the widget only ever shows a projection of it. */
  streaks: Record<AccountId, Streak>;
  /** Newest first, and capped: every request the page made and how Frame ended it. */
  ledger: LedgerEntry[];
  /** How many outcomes were ever recorded, so an entry keeps its id after older ones drop out. */
  recorded: number;
  /** What the guide steps have seen so far: unlike the capped ledger, it never forgets. */
  milestones: { published: boolean; refused: boolean; fenced: boolean };
};
