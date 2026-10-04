import { Frame } from "@priemskiyyy/frame";

import type { StreakFrame } from "src/types/StreakFrame";
import { streakWidget } from "src/widgets/streak/streakWidget";

/** A Frame with no adapter, on every platform: it keeps its shape and every request answers unavailable. */
export const unhostedFrame: StreakFrame = new Frame({
  widgets: { streak: streakWidget },
});
