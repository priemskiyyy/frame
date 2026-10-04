import type { WidgetHandle } from "@priemskiyyy/frame";

import type { StreakData } from "src/types/StreakData";

/** What a screen holds to publish the streak: one widget, in one context. */
export type StreakHandle = WidgetHandle<StreakData>;
