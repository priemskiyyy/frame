import type { Frame } from "@priemskiyyy/frame";

import type { streakWidget } from "src/widgets/streak/streakWidget";

/** Every platform's Frame has this type, whichever adapters host the widget. */
export type StreakFrame = Frame<{ streak: typeof streakWidget }>;
