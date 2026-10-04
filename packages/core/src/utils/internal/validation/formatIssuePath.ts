import type { StandardIssue } from "src/types/StandardIssue";
import { formatPath } from "src/utils/internal/transport/formatPath";

export const formatIssuePath = (path: StandardIssue["path"]) => {
  if (path === undefined) {
    return "";
  }

  const segments: (string | number)[] = [];

  for (const segment of path) {
    const key = typeof segment === "object" ? segment.key : segment;

    segments.push(typeof key === "symbol" ? key.toString() : key);
  }

  return formatPath(segments);
};
