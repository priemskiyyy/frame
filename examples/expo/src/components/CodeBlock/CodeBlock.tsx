import type React from "react";
import { Text, View } from "react-native";

type CodeBlockProps = {
  children: string;
};

export const CodeBlock: React.FunctionComponent<CodeBlockProps> = ({
  children,
}) => (
  <View className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800">
    <Text
      selectable
      className="font-mono text-xs text-zinc-700 dark:text-zinc-300"
    >
      {children}
    </Text>
  </View>
);
