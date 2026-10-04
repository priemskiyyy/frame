import { Frame } from "@priemskiyyy/frame";
import { expoWidget } from "@priemskiyyy/frame-expo";
import * as ExpoWidgets from "expo-widgets";

import type { StreakFrame } from "src/types/StreakFrame";
import { StreakView } from "src/widgets/streak/streakView";
import { streakWidget } from "src/widgets/streak/streakWidget";

/** The real home screen widget, over expo-widgets. */
export const deviceFrame: StreakFrame = new Frame({
  widgets: { streak: streakWidget },
  adapters: [
    expoWidget(streakWidget, { sdk: ExpoWidgets, render: StreakView }),
  ],
});
