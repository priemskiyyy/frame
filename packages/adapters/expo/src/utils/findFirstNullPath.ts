import type { JsonValue } from "@priemskiyyy/frame/adapter";

export const findFirstNullPath = (
  value: JsonValue | undefined,
  path = "",
): string | null => {
  if (value === null) {
    return path;
  }

  if (typeof value !== "object") {
    return null;
  }

  const [first] = Object.entries(value).flatMap(([key, child]) => {
    const found = findFirstNullPath(
      child,
      Array.isArray(value)
        ? `${path}[${key}]`
        : `${path}${path === "" ? "" : "."}${key}`,
    );

    if (found === null) {
      return [];
    }

    return [found];
  });

  return first ?? null;
};
