import type { StreakFrame } from "src/types/StreakFrame";

// Registered once, next to the frames, so every hook is typed by the streak widget.
declare module "@priemskiyyy/frame-react" {
  interface Register {
    frame: StreakFrame;
  }
}
