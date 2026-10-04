import type { Streak } from "src/types/Streak";
import type { StreakData } from "src/types/StreakData";

/**
 * What the app turns its own streak into before it publishes: the final
 * display data and nothing else. The schema validates this value as it is,
 * so shaping it happens here, never in the schema.
 */
export const projectStreak = (
  streak: Streak,
  updatedAt: number,
): StreakData => ({
  state: "ready",
  habit: streak.habit,
  days: streak.days,
  best: Math.max(streak.best, streak.days),
  week: streak.week,
  updatedAt,
});
