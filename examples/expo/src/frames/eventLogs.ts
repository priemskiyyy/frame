import { FRAMES } from "src/frames/frames";
import { createEventLog } from "src/utils/createEventLog";

/** One event log per provider, listening from startup so switching providers loses nothing. */
export const EVENT_LOGS = {
  device: createEventLog(FRAMES.device),
  simulated: createEventLog(FRAMES.simulated),
  unhosted: createEventLog(FRAMES.unhosted),
};
