import { widget } from "@priemskiyyy/frame";

import { StreakSchema } from "src/widgets/streak/StreakSchema";

export const streakWidget = widget({
  name: "StreakWidget",
  schema: StreakSchema,
  fallback: { state: "empty" },
});
