import type { Capture } from "src/types/internal/Capture";
import type { FrameLimits } from "src/types/FrameLimits";
import type { JsonRecord } from "src/types/JsonRecord";
import { toError } from "src/utils/internal/errors/toError";
import { SnapshotWalker } from "src/utils/internal/transport/SnapshotWalker";

/**
 * Reads a value into its canonical wire text, or says why it cannot travel.
 * The text is the one fact the rest of Frame compares, hashes and copies. A
 * value that throws when it is read, such as a revoked proxy, or that is nested
 * past what the stack can walk, cannot travel either.
 */
export const captureSnapshot = (
  value: JsonRecord,
  limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">,
): Capture => {
  try {
    return new SnapshotWalker(limits).capture(value);
  } catch (error) {
    return {
      status: "rejected",
      reason: "not-transportable",
      issues: [
        {
          path: "",
          message: `The value could not be read: ${toError(error).message}`,
        },
      ],
    };
  }
};
