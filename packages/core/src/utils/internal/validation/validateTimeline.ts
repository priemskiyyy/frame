import type { FrameLimits } from "src/types/FrameLimits";
import type { Rejection } from "src/types/internal/Rejection";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";
import { MAX_INSTANT } from "src/utils/constants/instant";

const reject = (
  reason: Rejection["reason"],
  path: string,
  message: string,
): Rejection => ({ status: "rejected", reason, issues: [{ path, message }] });

/**
 * Checks what a timeline's shape promises before any entry is validated: some
 * entries, few enough, whole-millisecond instants, strictly increasing, and a
 * first one that is current or past, so something is shown from the moment it
 * lands.
 */
export const validateTimeline = <TData extends JsonRecord>(
  entries: TimelineEntry<TData>[],
  { now, limits }: { now: number; limits: Pick<FrameLimits, "entries"> },
): Rejection | null => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return reject(
      "invalid-timeline",
      "entries",
      "A timeline needs at least one entry.",
    );
  }

  if (entries.length > limits.entries) {
    return reject(
      "limit-exceeded",
      "entries",
      `A timeline has at most ${limits.entries} entries.`,
    );
  }

  let previous = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];

    if (typeof entry !== "object" || entry === null) {
      return reject(
        "invalid-timeline",
        `entries[${index}]`,
        "An entry is a record with an at and a data.",
      );
    }

    if (!Number.isSafeInteger(entry.at)) {
      return reject(
        "invalid-timeline",
        `entries[${index}].at`,
        "An instant is a safe integer of epoch milliseconds.",
      );
    }

    if (Math.abs(entry.at) > MAX_INSTANT) {
      return reject(
        "invalid-timeline",
        `entries[${index}].at`,
        "An instant is within the range a Date can hold.",
      );
    }

    if (entry.at <= previous) {
      return reject(
        "invalid-timeline",
        `entries[${index}].at`,
        "Instants must be strictly increasing.",
      );
    }

    previous = entry.at;
  }

  const [first] = entries;

  if (first !== undefined && first.at > now) {
    return reject(
      "invalid-timeline",
      "entries[0].at",
      "The first entry must be current or past, so something is shown at once.",
    );
  }

  return null;
};
