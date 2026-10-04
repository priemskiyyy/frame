import type { FrameLimits } from "src/types/FrameLimits";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { validateSnapshot } from "src/utils/internal/validation/validateSnapshot";

const readEntry = async (
  definition: WidgetDefinition,
  entry: TimelineEntry<JsonRecord>,
  limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">,
): Promise<TimelineEntry<JsonRecord> | null> => {
  try {
    if (!Number.isSafeInteger(entry.at)) {
      return null;
    }

    const captured = captureSnapshot(entry.data, limits);

    if (captured.status === "rejected") {
      return null;
    }

    const validation = await validateSnapshot(
      definition,
      captured.canonical,
      limits,
    );

    if (validation.status === "rejected") {
      return null;
    }

    return { at: entry.at, data: validation.snapshot };
  } catch {
    // A provider can store anything, so an entry that cannot be read is one it stored wrongly.
    return null;
  }
};

// What the schema refuses, such as data an older build wrote, is counted and dropped, never cast into the current shape.
export const readEntries = async (
  definition: WidgetDefinition,
  stored: TimelineEntry<JsonRecord>[],
  limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">,
) => {
  const entries: TimelineEntry<JsonRecord>[] = [];
  let rejected = 0;

  for (const entry of stored) {
    const read = await readEntry(definition, entry, limits);

    if (read === null) {
      rejected += 1;
      continue;
    }

    entries.push(read);
  }

  return { entries, rejected };
};
