import type React from "react";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { Lightbulb } from "phosphor-react-native/src/icons/Lightbulb";

import { Heading } from "src/components/Heading/Heading";
import { useScheme } from "src/hooks/useScheme";
import { getToneColor } from "src/utils/getToneColor";

type SectionProps = PropsWithChildren<{
  title: string;
  hint: string;
}>;

export const Section: React.FunctionComponent<SectionProps> = ({
  title,
  hint,
  children,
}) => {
  const scheme = useScheme();

  return (
    <View className="gap-3">
      <Heading level={2}>{title}</Heading>
      <View className="flex-row items-start gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
        <Lightbulb
          size={16}
          weight="fill"
          color={getToneColor("warning", scheme)}
        />
        <Text className="flex-1 text-sm text-amber-900 dark:text-amber-200">
          <Text className="font-semibold">Try this: </Text>
          {hint}
        </Text>
      </View>
      {children}
    </View>
  );
};
