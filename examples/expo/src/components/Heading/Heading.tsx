import type React from "react";
import { Text } from "react-native";

const HEADING_CLASSES: Record<1 | 2 | 3, string> = {
  1: "text-3xl font-bold text-zinc-900 dark:text-zinc-50",
  2: "text-xl font-bold text-zinc-900 dark:text-zinc-50",
  3: "text-base font-semibold text-zinc-900 dark:text-zinc-50",
};

type HeadingProps = {
  level: 1 | 2 | 3;
  children: string;
};

export const Heading: React.FunctionComponent<HeadingProps> = ({
  level,
  children,
}) => {
  // react-native-web turns aria-level into h1 to h6, and native reads the header role. RN's types do not list it.
  const webLevel = { "aria-level": level };

  return (
    <Text
      accessibilityRole="header"
      className={HEADING_CLASSES[level]}
      {...webLevel}
    >
      {children}
    </Text>
  );
};
