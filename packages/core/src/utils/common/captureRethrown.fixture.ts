import { vi } from "vitest";
import { toError } from "src/utils/internal/errors/toError";

/** Takes over the microtask queue, so the errors `isolate` rethrows are read by the test instead of reaching the host. */
export const captureRethrown = () => {
  const callbacks: (() => void)[] = [];

  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
    callbacks.push(callback);
  });

  return () => {
    const errors: Error[] = [];

    for (const callback of callbacks.splice(0)) {
      try {
        callback();
      } catch (error) {
        errors.push(toError(error));
      }
    }

    return errors;
  };
};
