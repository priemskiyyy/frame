import { Frame } from "@priemskiyyy/frame";

import type { StreakFrame } from "src/types/StreakFrame";
import { streakWidget } from "src/widgets/streak/streakWidget";

/** Every platform without a widget host: no adapter, so publishing says so and never pretends to succeed. */
export const deviceFrame: StreakFrame = new Frame({
  widgets: { streak: streakWidget },
});
