import { DEFAULT_TIMEOUT, MAX_TIMEOUT } from "src/utils/constants/defaults";
import { FrameError } from "src/utils/FrameError";

export const resolveTimeout = (timeout: number | undefined) => {
  if (timeout === undefined) {
    return DEFAULT_TIMEOUT;
  }

  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > MAX_TIMEOUT) {
    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `timeout is a positive number of milliseconds no larger than ${MAX_TIMEOUT}, not ${timeout}.`,
    });
  }

  return timeout;
};
