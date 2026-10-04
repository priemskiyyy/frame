import type { PublicationOutcome } from "@priemskiyyy/frame";
import { expect, test } from "vitest";

import { applicationReducer } from "src/state/applicationReducer";
import { initialApplicationState } from "src/state/initialApplicationState";
import { LEDGER_CAPACITY } from "src/utils/constants/ledger";

const outcomeOf = (
  status: "unchanged" | "submitted" | "invalid" | "expired",
) => {
  const request = { id: "r1" };

  if (status === "submitted") {
    return {
      request,
      status,
      kind: "snapshot",
      revision: 1,
      evidence: "simulated",
    } satisfies PublicationOutcome;
  }

  if (status === "invalid") {
    return {
      request,
      status,
      reason: "schema-rejected",
      issues: [],
    } satisfies PublicationOutcome;
  }

  if (status === "expired") {
    return { request, status } satisfies PublicationOutcome;
  }

  return { request, status, revision: 1 } satisfies PublicationOutcome;
};

const record = (
  state = initialApplicationState,
  label = "Publish",
  status: "unchanged" | "submitted" | "invalid" | "expired" = "unchanged",
) =>
  applicationReducer(state, {
    type: "OUTCOME_RECORDED",
    label,
    provider: "device",
    outcome: outcomeOf(status),
    at: 100,
  });

test("selecting a provider or an account changes only that", () => {
  const provider = applicationReducer(initialApplicationState, {
    type: "PROVIDER_SELECTED",
    provider: "simulated",
  });

  const account = applicationReducer(initialApplicationState, {
    type: "ACCOUNT_SELECTED",
    account: "grace",
  });

  expect(provider).toEqual({
    ...initialApplicationState,
    provider: "simulated",
  });
  expect(account).toEqual({ ...initialApplicationState, account: "grace" });
});

test("an edited streak replaces the signed in account's streak and leaves the other alone", () => {
  const edited = applicationReducer(initialApplicationState, {
    type: "STREAK_EDITED",
    streak: {
      habit: "Swim",
      days: 3,
      best: 3,
      week: [true, false, false, false, false, false, false],
    },
  });

  expect(edited.streaks.ada.habit).toBe("Swim");
  expect(edited.streaks.grace).toBe(initialApplicationState.streaks.grace);
});

test("an edit after a switch lands on the account that is signed in now", () => {
  const switched = applicationReducer(initialApplicationState, {
    type: "ACCOUNT_SELECTED",
    account: "grace",
  });

  const edited = applicationReducer(switched, {
    type: "STREAK_EDITED",
    streak: { ...switched.streaks.grace, days: 41 },
  });

  expect(edited.streaks.grace.days).toBe(41);
  expect(edited.streaks.ada).toBe(initialApplicationState.streaks.ada);
});

test("a recorded outcome goes first, gets the next id and keeps its label and provider", () => {
  const first = record();
  const second = record(first, "Publish again");

  expect(second.ledger.map(({ id, label }) => [id, label])).toEqual([
    [2, "Publish again"],
    [1, "Publish"],
  ]);
  expect(second.ledger[0]?.provider).toBe("device");
  expect(second.recorded).toBe(2);
});

test("the ledger keeps only its capacity, and ids keep counting", () => {
  let state = initialApplicationState;

  for (let index = 0; index < LEDGER_CAPACITY + 5; index += 1) {
    state = record(state);
  }

  expect(state.ledger).toHaveLength(LEDGER_CAPACITY);
  expect(state.ledger[0]?.id).toBe(LEDGER_CAPACITY + 5);
  expect(state.recorded).toBe(LEDGER_CAPACITY + 5);
});

test("clearing the ledger keeps the count, so a new entry never reuses an id", () => {
  const cleared = applicationReducer(record(), { type: "LEDGER_CLEARED" });

  expect(cleared.ledger).toEqual([]);
  expect(record(cleared).ledger[0]?.id).toBe(2);
});

test("a guide step stays done after the ledger forgets what finished it", () => {
  let state = record(initialApplicationState, "Switch", "expired");

  state = record(state, "Publish", "submitted");
  state = record(state, "Bad", "invalid");

  for (let index = 0; index < LEDGER_CAPACITY + 2; index += 1) {
    state = record(state);
  }

  state = applicationReducer(state, { type: "LEDGER_CLEARED" });

  expect(state.milestones).toEqual({
    published: true,
    refused: true,
    fenced: true,
  });
  expect(initialApplicationState.milestones).toEqual({
    published: false,
    refused: false,
    fenced: false,
  });
});
