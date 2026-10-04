import type React from "react";
import { Text, View } from "react-native";
import clsx from "clsx";
import { Check } from "phosphor-react-native/src/icons/Check";

import { Badge } from "src/components/Badge/Badge";

type GuideStepProps = {
  number: number;
  title: string;
  description: string;
  done: boolean;
};

export const GuideStep: React.FunctionComponent<GuideStepProps> = ({
  number,
  title,
  description,
  done,
}) => (
  <View role="listitem" className="flex-row items-start gap-3">
    <View
      className={clsx(
        "h-7 w-7 items-center justify-center rounded-full",
        done ? "bg-emerald-700" : "bg-orange-700",
      )}
    >
      {done ? (
        <Check size={14} weight="bold" color="#ffffff" />
      ) : (
        <Text className="text-sm font-bold text-white">{number}</Text>
      )}
    </View>
    <View className="flex-1 gap-0.5">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </Text>
        {done ? <Badge tone="positive">Done</Badge> : null}
      </View>
      <Text className="text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </Text>
    </View>
  </View>
);
