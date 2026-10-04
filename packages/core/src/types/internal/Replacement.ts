import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";

/** What one accepted request puts in place of everything shown before: owned, frozen, validated. */
export type Replacement =
  | { kind: "snapshot"; snapshot: JsonRecord; canonical: string }
  | {
      kind: "timeline";
      entries: TimelineEntry<JsonRecord>[];
      canonical: string;
      /** The latest entry not in the future when the schedule landed: what the widget shows at once. */
      current: { snapshot: JsonRecord; canonical: string };
    };
