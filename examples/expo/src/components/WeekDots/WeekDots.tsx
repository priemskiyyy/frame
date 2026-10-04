import type React from "react";
import { Text, View } from "react-native";
import clsx from "clsx";

import { WEEKDAYS } from "src/utils/constants/habits";

type WeekDotsProps = {
  week: boolean[];
};

export const WeekDots: React.FunctionComponent<WeekDotsProps> = ({ week }) => {
  const done = WEEKDAYS.filter((_, index) => week[index]);

  return (
    <View
      accessible
      accessibilityLabel={`${done.length} of 7 days done this week${done.length === 0 ? "" : `: ${done.join(", ")}`}`}
      className="flex-row gap-1.5"
    >
      {week.map((isDone, index) => (
        <View key={WEEKDAYS[index]} className="items-center gap-0.5">
          <View
            className={clsx(
              "h-2.5 w-2.5 rounded-full",
              isDone ? "bg-amber-100" : "bg-black/25",
            )}
          />
          <Text className="text-[9px] font-medium text-white/90">
            {WEEKDAYS[index]?.charAt(0)}
          </Text>
        </View>
      ))}
    </View>
  );
};
