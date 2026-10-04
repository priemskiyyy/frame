import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";

/** A timeline every entry of which its schema accepted, with its current entry told apart: the latest one not in the future. */
export type ValidatedEntries = {
  entries: TimelineEntry<JsonRecord>[];
  current: { snapshot: JsonRecord; canonical: string };
};
