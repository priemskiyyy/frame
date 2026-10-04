import type { createStreakFrame } from "src/hooks/hooks.fixture";

// An interface, because declaration merging is how an application registers its Frame.
declare module "src/types/Register" {
  interface Register {
    frame: ReturnType<typeof createStreakFrame>["frame"];
  }
}
