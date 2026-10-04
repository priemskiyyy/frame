import type React from "react";
import { Text, View } from "react-native";

export const Footer: React.FunctionComponent = () => (
  <View className="items-center gap-1 pb-4 pt-2">
    <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
      Real: expo-widgets on iOS. Simulated: Frame's mock provider.
    </Text>
    <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
      A submitted publish means the provider call returned, not that the widget
      redrew.
    </Text>
  </View>
);
