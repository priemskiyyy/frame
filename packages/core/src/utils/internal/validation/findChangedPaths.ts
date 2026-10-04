import type { JsonValue } from "src/types/JsonValue";
import { formatPath } from "src/utils/internal/transport/formatPath";

const MAX_PATHS = 10;

const collect = (
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  path: (string | number)[],
  found: string[],
) => {
  if (found.length >= MAX_PATHS || before === after) {
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);

    for (let index = 0; index < length; index += 1) {
      collect(before[index], after[index], [...path, index], found);
    }

    return;
  }

  if (
    typeof before === "object" &&
    before !== null &&
    !Array.isArray(before) &&
    typeof after === "object" &&
    after !== null &&
    !Array.isArray(after)
  ) {
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])) {
      collect(
        Object.hasOwn(before, key) ? before[key] : undefined,
        Object.hasOwn(after, key) ? after[key] : undefined,
        [...path, key],
        found,
      );
    }

    return;
  }

  found.push(formatPath(path));
};

/**
 * Names where two values differ, as paths such as `label` or `items[2].tag`,
 * the first few only. A whole-value difference is the empty path.
 */
export const findChangedPaths = (before: JsonValue, after: JsonValue) => {
  const found: string[] = [];

  collect(before, after, [], found);

  return found;
};
