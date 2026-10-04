import type React from "react";
import { Text, View } from "react-native";

type EmptyStateProps = {
  message: string;
};

export const EmptyState: React.FunctionComponent<EmptyStateProps> = ({
  message,
}) => (
  <View className="items-center justify-center rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
    <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
      {message}
    </Text>
  </View>
);
