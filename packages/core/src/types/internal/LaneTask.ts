import type { LaneStop } from "src/types/internal/LaneStop";

export type LaneTask = {
  /** Makes the call and keeps its answer. Runs at most once, and never while another task of the lane runs. */
  start: () => Promise<void>;
  /** Runs when the task ended without an answer, and never after `start` resolved in time. */
  onStop: (stop: LaneStop) => void;
};
