import type React from "react";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

type FactProps = PropsWithChildren<{
  label: string;
}>;

export const Fact: React.FunctionComponent<FactProps> = ({
  label,
  children,
}) => (
  <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
    {children}
  </View>
);
