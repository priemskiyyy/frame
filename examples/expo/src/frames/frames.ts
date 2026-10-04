import { deviceFrame } from "src/frames/deviceFrame";
import { simulatedProvider } from "src/frames/simulatedProvider";
import { unhostedFrame } from "src/frames/unhostedFrame";
import type { Provider } from "src/types/Provider";
import type { StreakFrame } from "src/types/StreakFrame";

/** One Frame per provider: all of them exist at once, and the switcher picks which one the page drives. */
export const FRAMES = {
  device: deviceFrame,
  simulated: simulatedProvider.frame,
  unhosted: unhostedFrame,
} satisfies Record<Provider, StreakFrame>;
