import type { Rejection } from "src/types/internal/Rejection";

/** Moves a rejection's issue paths from one entry's data to the timeline's root, such as `entries[2].data.days`. */
export const placeRejectionInEntry = (
  rejection: Rejection,
  index: number,
): Rejection => ({
  ...rejection,
  issues: rejection.issues.map(({ path, message }) => ({
    path:
      path === "" ? `entries[${index}].data` : `entries[${index}].data.${path}`,
    message,
  })),
});
