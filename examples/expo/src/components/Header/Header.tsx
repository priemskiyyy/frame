import type React from "react";
import { Text, View } from "react-native";
import { Flame } from "phosphor-react-native/src/icons/Flame";

export const Header: React.FunctionComponent = () => (
  <View className="flex-row items-center gap-2">
    <View className="h-8 w-8 items-center justify-center rounded-xl bg-orange-600">
      <Flame size={18} weight="fill" color="#ffffff" />
    </View>
    <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50">
      Frame Studio
    </Text>
  </View>
);
