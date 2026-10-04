import type { EntryText } from "src/types/internal/EntryText";
import type { Rejection } from "src/types/internal/Rejection";
import type { FrameLimits } from "src/types/FrameLimits";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { getUtf8Length } from "src/utils/internal/transport/getUtf8Length";
import { placeRejectionInEntry } from "src/utils/internal/validation/placeRejectionInEntry";

/**
 * Reads every entry of a timeline into its canonical text, under the limits of
 * one value each and of the whole timeline together, so sixty-four entries that
 * each fit cannot add up to more than the Frame allows.
 */
export const captureEntries = (
  entries: TimelineEntry<JsonRecord>[],
  limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">,
): { status: "captured"; texts: EntryText[] } | Rejection => {
  const texts: EntryText[] = [];
  let bytes = 0;

  for (const [index, entry] of entries.entries()) {
    const captured = captureSnapshot(entry.data, limits);

    if (captured.status === "rejected") {
      return placeRejectionInEntry(captured, index);
    }

    bytes += getUtf8Length(captured.canonical);
    texts.push({ at: entry.at, canonical: captured.canonical });
  }

  if (bytes > limits.bytes) {
    return {
      status: "rejected",
      reason: "limit-exceeded",
      issues: [
        {
          path: "entries",
          message: `The timeline is larger than ${limits.bytes} bytes.`,
        },
      ],
    };
  }

  return { status: "captured", texts };
};
