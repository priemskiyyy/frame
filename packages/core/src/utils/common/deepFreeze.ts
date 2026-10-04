import { isError } from "src/utils/internal/errors/isError";

export const deepFreeze = <TValue>(value: TValue): TValue => {
  // An `Error` stays unfrozen, because whoever threw it may still add to it.
  if (typeof value !== "object" || value === null || isError(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  Object.freeze(value);

  return value;
};
