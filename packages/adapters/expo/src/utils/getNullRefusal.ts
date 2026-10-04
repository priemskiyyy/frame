import type { JsonValue, SubmissionResult } from "@priemskiyyy/frame/adapter";

import { NULL_REFUSED_MESSAGE } from "src/utils/constants/unavailable";
import { findFirstNullPath } from "src/utils/findFirstNullPath";

export const getNullRefusal = (
  value: JsonValue,
  path: string,
): SubmissionResult | null => {
  const nullPath = findFirstNullPath(value, path);

  if (nullPath === null) {
    return null;
  }

  return {
    status: "failed",
    error: new Error(`${NULL_REFUSED_MESSAGE}, found at ${nullPath}.`),
  };
};
