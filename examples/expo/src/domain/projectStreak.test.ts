import { expect, test } from "vitest";

import { projectStreak } from "src/domain/projectStreak";
import { ACCOUNTS } from "src/utils/constants/accounts";
import { StreakSchema } from "src/widgets/streak/StreakSchema";

const { streak } = ACCOUNTS.ada;

test("the projection is the display data and carries the instant it was made at", () => {
  expect(projectStreak(streak, 1_760_000_000_000)).toEqual({
    state: "ready",
    habit: "Run",
    days: 12,
    best: 21,
    week: [true, true, false, true, true, true, false],
    updatedAt: 1_760_000_000_000,
  });
});

test("the best streak is never below the current one", () => {
  expect(projectStreak({ ...streak, days: 30 }, 1)).toMatchObject({ best: 30 });
  expect(projectStreak({ ...streak, days: 3 }, 1)).toMatchObject({ best: 21 });
});

test("every projection of a streak the editor can make is what the schema accepts unchanged", () => {
  for (const days of [0, 1, 99]) {
    const projected = projectStreak({ ...streak, days }, 1);

    expect(StreakSchema.parse(projected)).toEqual(projected);
  }
});

test("projecting leaves the streak the app keeps alone", () => {
  const before = JSON.stringify(streak);

  projectStreak(streak, 1);

  expect(JSON.stringify(streak)).toBe(before);
});
