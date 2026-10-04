import type { ApplicationState } from "src/state/ApplicationState";
import { ACCOUNTS } from "src/utils/constants/accounts";

export const initialApplicationState: ApplicationState = {
  provider: "device",
  account: "ada",
  streaks: {
    ada: ACCOUNTS.ada.streak,
    grace: ACCOUNTS.grace.streak,
  },
  ledger: [],
  recorded: 0,
  milestones: { published: false, refused: false, fenced: false },
};
