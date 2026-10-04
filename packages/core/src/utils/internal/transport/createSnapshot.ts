import type { JsonValue } from "src/types/JsonValue";
import { deepFreeze } from "src/utils/common/deepFreeze";

/**
 * Builds the frozen value a canonical text stands for. The text came from
 * `captureSnapshot`, so nothing in the result is shared with the caller, and
 * a key such as `__proto__` is data.
 */
export const createSnapshot = <TValue extends JsonValue>(
  canonical: string,
): TValue => {
  // JSON.parse answers any, and the canonical text came from captureSnapshot.
  return deepFreeze(JSON.parse(canonical));
};
