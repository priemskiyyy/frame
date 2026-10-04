import { Frame } from "@priemskiyyy/frame";
import { createMockAdapter } from "@priemskiyyy/frame/mock";

import type { StreakFrame } from "src/types/StreakFrame";
import { SIMULATED_TIMEOUT } from "src/utils/constants/simulated";
import { streakWidget } from "src/widgets/streak/streakWidget";

const { adapter, control } = createMockAdapter(streakWidget);

const frame: StreakFrame = new Frame({
  widgets: { streak: streakWidget },
  adapters: [adapter],
  timeout: SIMULATED_TIMEOUT,
});

/** Frame's mock: it answers `simulated` evidence, and its control makes it hold, fail or hang. */
export const simulatedProvider = { frame, control };
