import { cva } from "class-variance-authority";

import type { Tone } from "src/types/Tone";

export const toneContainerStyles = cva("", {
  variants: {
    tone: {
      neutral:
        "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800",
      info: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/60",
      positive:
        "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60",
      warning:
        "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60",
      danger:
        "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/60",
    } satisfies Record<Tone, string>,
  },
});
