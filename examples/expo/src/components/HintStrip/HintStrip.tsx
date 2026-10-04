import type React from "react";
import { Text, View } from "react-native";
import { Info } from "phosphor-react-native/src/icons/Info";

import { useScheme } from "src/hooks/useScheme";
import { getToneColor } from "src/utils/getToneColor";

type HintStripProps = {
  message: string;
};

export const HintStrip: React.FunctionComponent<HintStripProps> = ({
  message,
}) => {
  const scheme = useScheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 rounded-xl bg-sky-50 p-3 dark:bg-sky-950/40"
    >
      <Info size={16} weight="fill" color={getToneColor("info", scheme)} />
      <Text className="flex-1 text-sm text-sky-900 dark:text-sky-200">
        {message}
      </Text>
    </View>
  );
};
