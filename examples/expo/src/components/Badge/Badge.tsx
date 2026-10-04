import type React from "react";
import { Text, View } from "react-native";
import { cva } from "class-variance-authority";
import clsx from "clsx";

import type { Tone } from "src/types/Tone";
import { toneContainerStyles } from "src/utils/toneContainerStyles";

const badgeTextStyles = cva("text-xs font-medium", {
  variants: {
    tone: {
      neutral: "text-zinc-700 dark:text-zinc-300",
      info: "text-sky-700 dark:text-sky-300",
      positive: "text-emerald-700 dark:text-emerald-300",
      warning: "text-amber-800 dark:text-amber-300",
      danger: "text-rose-700 dark:text-rose-300",
    } satisfies Record<Tone, string>,
  },
});

type BadgeProps = {
  tone: Tone;
  children: string;
};

export const Badge: React.FunctionComponent<BadgeProps> = ({
  tone,
  children,
}) => (
  <View
    className={clsx(
      "self-start rounded-full border px-2.5 py-0.5",
      toneContainerStyles({ tone }),
    )}
  >
    <Text className={badgeTextStyles({ tone })}>{children}</Text>
  </View>
);
