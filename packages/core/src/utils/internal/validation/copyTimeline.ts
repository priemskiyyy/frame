import type { Rejection } from "src/types/internal/Rejection";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";
import { toError } from "src/utils/internal/errors/toError";

/**
 * Reads a timeline's entries once. What is checked is then what is sent, so an
 * instant that answers differently each time it is read cannot pass the checks
 * and arrive changed, and an entry that throws when it is read is refused.
 */
export const copyTimeline = (
  entries: TimelineEntry<JsonRecord>[],
): { status: "copied"; entries: TimelineEntry<JsonRecord>[] } | Rejection => {
  try {
    if (!Array.isArray(entries)) {
      return { status: "copied", entries };
    }

    const copy: TimelineEntry<JsonRecord>[] = [];

    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) {
        copy.push(entry);
        continue;
      }

      copy.push({ at: entry.at, data: entry.data });
    }

    return { status: "copied", entries: copy };
  } catch (error) {
    return {
      status: "rejected",
      reason: "not-transportable",
      issues: [
        {
          path: "entries",
          message: `The timeline could not be read: ${toError(error).message}`,
        },
      ],
    };
  }
};
