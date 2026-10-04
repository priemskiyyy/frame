import type { PreviewFamily } from "src/types/PreviewFamily";

export const PREVIEW_FAMILY_LABELS = {
  systemSmall: "Small",
  systemMedium: "Medium",
} satisfies Record<PreviewFamily, string>;

/** Width over height of each family on a 6.1 inch iPhone: 158 by 158 points, and 338 by 158. */
export const PREVIEW_FAMILY_ASPECTS = {
  systemSmall: 158 / 158,
  systemMedium: 338 / 158,
} satisfies Record<PreviewFamily, number>;

export const PREVIEW_FAMILY_IDS = [
  "systemSmall",
  "systemMedium",
] satisfies PreviewFamily[];
