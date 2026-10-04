import type { FrameOptions } from "src/types/FrameOptions";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { FrameError } from "src/utils/FrameError";

export const resolveLimits = (
  limits: NonNullable<FrameOptions["limits"]> = {},
) => {
  const resolved = {
    depth: limits.depth ?? DEFAULT_LIMITS.depth,
    nodes: limits.nodes ?? DEFAULT_LIMITS.nodes,
    bytes: limits.bytes ?? DEFAULT_LIMITS.bytes,
    entries: limits.entries ?? DEFAULT_LIMITS.entries,
  };

  const invalid = Object.entries(resolved).find(
    ([, value]) => !Number.isSafeInteger(value) || value <= 0,
  );

  if (invalid !== undefined) {
    const [name, value] = invalid;

    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `limits.${name} is a positive integer, not ${value}.`,
    });
  }

  return resolved;
};
