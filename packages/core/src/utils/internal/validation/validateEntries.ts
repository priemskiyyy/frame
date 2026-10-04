import type { EntryText } from "src/types/internal/EntryText";
import type { ValidatedEntries } from "src/types/internal/ValidatedEntries";
import type { Validation } from "src/types/internal/Validation";
import type { FrameLimits } from "src/types/FrameLimits";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import { placeRejectionInEntry } from "src/utils/internal/validation/placeRejectionInEntry";
import { validateSnapshot } from "src/utils/internal/validation/validateSnapshot";

type Answered = { text: EntryText; result: Validation<JsonRecord> };

const collect = (
  answered: Answered[],
  now: number,
): Validation<ValidatedEntries> => {
  const accepted: { entry: TimelineEntry<JsonRecord>; canonical: string }[] =
    [];

  for (const [index, { text, result }] of answered.entries()) {
    if (result.status === "rejected") {
      return placeRejectionInEntry(result, index);
    }

    accepted.push({
      entry: Object.freeze({ at: text.at, data: result.snapshot }),
      canonical: text.canonical,
    });
  }

  const current = accepted.reduce((latest, candidate) => {
    if (candidate.entry.at <= now) {
      return candidate;
    }

    return latest;
  });

  const entries = accepted.map(({ entry }) => entry);

  Object.freeze(entries);

  return {
    status: "valid",
    snapshot: {
      entries,
      current: {
        snapshot: current.entry.data,
        canonical: current.canonical,
      },
    },
  };
};

/**
 * Validates every entry of a timeline, and answers synchronously when every
 * schema answer is. The current entry is the latest one not after `now`;
 * `validateTimeline` has already refused a timeline that is empty or whose
 * first entry is in the future.
 */
export const validateEntries = (
  definition: WidgetDefinition,
  texts: EntryText[],
  {
    limits,
    now,
  }: { limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">; now: number },
): Validation<ValidatedEntries> | Promise<Validation<ValidatedEntries>> => {
  const asked = texts.map((text) => ({
    text,
    validation: validateSnapshot(definition, text.canonical, limits),
  }));

  const answered: Answered[] = [];

  for (const { text, validation } of asked) {
    if ("then" in validation) {
      return Promise.all(
        asked.map(({ text: entryText, validation: pending }) =>
          Promise.resolve(pending).then((result) => ({
            text: entryText,
            result,
          })),
        ),
      ).then((results) => collect(results, now));
    }

    answered.push({ text, result: validation });
  }

  return collect(answered, now);
};
