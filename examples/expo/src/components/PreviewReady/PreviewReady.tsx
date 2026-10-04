import type React from "react";
import { Text, View } from "react-native";

import { WeekDots } from "src/components/WeekDots/WeekDots";
import type { PreviewFamily } from "src/types/PreviewFamily";
import { formatClockTime } from "src/utils/formatClockTime";
import type { StreakData } from "src/types/StreakData";

type PreviewReadyProps = {
  data: Extract<StreakData, { state: "ready" }>;
  family: PreviewFamily;
};

export const PreviewReady: React.FunctionComponent<PreviewReadyProps> = ({
  data,
  family,
}) => {
  const count = (
    <View>
      <Text className="text-xs font-semibold text-white">{data.habit}</Text>
      <Text className="text-5xl font-bold text-white">{data.days}</Text>
      <Text className="text-xs font-medium text-white/90">
        {`day streak · best ${data.best}`}
      </Text>
    </View>
  );

  if (family === "systemSmall") {
    return (
      <View className="flex-1 justify-between p-4">
        {count}
        <WeekDots week={data.week} />
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row items-center justify-between p-4">
      {count}
      <View className="items-end gap-2">
        <WeekDots week={data.week} />
        <Text className="text-[10px] text-white/80">
          {`updated ${formatClockTime(data.updatedAt).slice(0, 8)}`}
        </Text>
      </View>
    </View>
  );
};
