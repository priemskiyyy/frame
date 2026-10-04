import type { ObservableValue } from "@priemskiyyy/frame";

import type { LoggedEvent } from "src/types/LoggedEvent";
import type { StreakFrame } from "src/types/StreakFrame";
import { EVENT_LOG_CAPACITY } from "src/utils/constants/ledger";

/**
 * Keeps the newest diagnostics events of a Frame, newest first, from the moment
 * it is made. Listening to a Frame's events creates no demand on it.
 */
export const createEventLog = (
  frame: StreakFrame,
): ObservableValue<LoggedEvent[]> => {
  let events: LoggedEvent[] = [];
  let logged = 0;
  const listeners = new Set<() => void>();

  frame.diagnostics.events.subscribe((event) => {
    logged += 1;
    events = [{ id: logged, event }, ...events].slice(0, EVENT_LOG_CAPACITY);

    for (const listener of [...listeners]) {
      listener();
    }
  });

  return {
    get: () => events,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
