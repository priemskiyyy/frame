import { Frame } from "@priemskiyyy/frame";
import { createMockAdapter, createTestClock } from "@priemskiyyy/frame/mock";

import type { StreakFrame } from "src/types/StreakFrame";
import { streakWidget } from "src/widgets/streak/streakWidget";

export const createMockStreakFrame = ({
  timeout,
}: { timeout?: number | undefined } = {}) => {
  const clock = createTestClock({ now: 1_760_000_000_000 });
  const { adapter, control } = createMockAdapter(streakWidget);

  const frame: StreakFrame = new Frame({
    widgets: { streak: streakWidget },
    adapters: [adapter],
    clock,
    timeout,
  });

  return { frame, control, clock };
};
