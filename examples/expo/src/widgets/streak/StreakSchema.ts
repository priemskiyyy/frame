import { z } from "zod";

/** The final display data of the habit streak: what the home screen shows, and nothing the app computes from. */
export const StreakSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("empty") }),
  z.object({
    state: z.literal("ready"),
    habit: z.string().min(1).max(24),
    days: z.number().int().nonnegative(),
    best: z.number().int().nonnegative(),
    week: z.array(z.boolean()).length(7),
    updatedAt: z.number().int().nonnegative(),
  }),
]);
