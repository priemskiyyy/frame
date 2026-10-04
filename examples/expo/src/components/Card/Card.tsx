import type React from "react";
import type { PropsWithChildren } from "react";
import type { Icon } from "phosphor-react-native";
import { Text, View } from "react-native";

import { Heading } from "src/components/Heading/Heading";
import { useScheme } from "src/hooks/useScheme";
import { getToneColor } from "src/utils/getToneColor";

type CardProps = PropsWithChildren<{
  title: string;
  description: string;
  icon: Icon;
}>;

export const Card: React.FunctionComponent<CardProps> = ({
  title,
  description,
  icon: CardIcon,
  children,
}) => {
  const scheme = useScheme();

  return (
    <View
      role="region"
      aria-label={title}
      className="gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <View className="gap-0.5">
        <View className="flex-row items-center gap-2">
          <CardIcon
            size={18}
            weight="bold"
            color={getToneColor("info", scheme)}
          />
          <Heading level={3}>{title}</Heading>
        </View>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </Text>
      </View>
      {children}
    </View>
  );
};
