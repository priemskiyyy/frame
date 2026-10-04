import type { Account } from "src/types/Account";
import type { AccountId } from "src/types/AccountId";

/** The demo's two accounts, each with a streak of its own. */
export const ACCOUNTS = {
  ada: {
    name: "Ada",
    streak: {
      habit: "Run",
      days: 12,
      best: 21,
      week: [true, true, false, true, true, true, false],
    },
  },
  grace: {
    name: "Grace",
    streak: {
      habit: "Read",
      days: 40,
      best: 40,
      week: [true, true, true, true, true, true, true],
    },
  },
} satisfies Record<AccountId, Account>;

/** The accounts in the order the switcher shows them. */
export const ACCOUNT_IDS = ["ada", "grace"] satisfies AccountId[];
