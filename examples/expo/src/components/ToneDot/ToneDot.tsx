import type React from "react";
import { View } from "react-native";
import { cva } from "class-variance-authority";

import type { Tone } from "src/types/Tone";

const dotStyles = cva("h-2.5 w-2.5 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-zinc-500",
      info: "bg-sky-600 dark:bg-sky-400",
      positive: "bg-emerald-600 dark:bg-emerald-400",
      warning: "bg-amber-600 dark:bg-amber-400",
      danger: "bg-rose-600 dark:bg-rose-400",
    } satisfies Record<Tone, string>,
  },
});

type ToneDotProps = {
  tone: Tone;
};

/** A colour cue only: the text beside it always says the same thing in words. */
export const ToneDot: React.FunctionComponent<ToneDotProps> = ({ tone }) => (
  <View accessible={false} className={dotStyles({ tone })} />
);
