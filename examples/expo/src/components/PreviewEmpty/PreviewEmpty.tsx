import type React from "react";
import { Text, View } from "react-native";
import { Flame } from "phosphor-react-native/src/icons/Flame";

export const PreviewEmpty: React.FunctionComponent = () => (
  <View className="flex-1 items-start justify-center gap-1.5 p-4">
    <Flame size={28} weight="fill" color="#fb923c" />
    <Text className="text-base font-semibold text-zinc-50">No streak yet</Text>
    <Text className="text-xs text-zinc-400">Open Frame Studio</Text>
  </View>
);
