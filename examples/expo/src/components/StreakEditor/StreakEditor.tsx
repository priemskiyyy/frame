import type React from "react";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";
import { Minus } from "phosphor-react-native/src/icons/Minus";
import { Plus } from "phosphor-react-native/src/icons/Plus";

import { Fact } from "src/components/Fact/Fact";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { useScheme } from "src/hooks/useScheme";
import type { Streak } from "src/types/Streak";
import { HABITS, WEEKDAYS } from "src/utils/constants/habits";
import { getToneColor } from "src/utils/getToneColor";
import { haptic } from "src/utils/haptic";

type StreakEditorProps = {
  streak: Streak;
  onChange: (streak: Streak) => void;
};

export const StreakEditor: React.FunctionComponent<StreakEditorProps> = ({
  streak,
  onChange,
}) => {
  const scheme = useScheme();
  const color = getToneColor("neutral", scheme);

  const handleHabitSelect = (habit: string) => onChange({ ...streak, habit });

  const handleDaysPress = (step: number) => {
    haptic();
    onChange({ ...streak, days: Math.max(0, streak.days + step) });
  };

  const handleDayPress = (index: number) => {
    haptic();
    onChange({
      ...streak,
      week: streak.week.map((done, day) => {
        if (day !== index) {
          return done;
        }

        return !done;
      }),
    });
  };

  return (
    <View className="gap-3">
      <SegmentedControl
        label="Habit"
        options={HABITS.map((habit) => ({ id: habit, label: habit }))}
        selected={streak.habit}
        onSelect={handleHabitSelect}
      />
      <Fact label="Days in a row">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One day less"
            className="h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 active:opacity-70 dark:bg-zinc-800"
            onPress={() => handleDaysPress(-1)}
          >
            <Minus size={16} weight="bold" color={color} />
          </Pressable>
          <Text className="min-w-8 text-center text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {streak.days}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One day more"
            className="h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 active:opacity-70 dark:bg-zinc-800"
            onPress={() => handleDaysPress(1)}
          >
            <Plus size={16} weight="bold" color={color} />
          </Pressable>
        </View>
      </Fact>
      <Fact label="This week">
        <View className="w-full flex-row">
          {streak.week.map((done, index) => (
            <Pressable
              key={WEEKDAYS[index]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={WEEKDAYS[index]}
              className="min-h-11 flex-1 items-center justify-center active:opacity-70"
              onPress={() => handleDayPress(index)}
            >
              <View
                className={clsx(
                  "h-8 w-8 items-center justify-center rounded-full",
                  done ? "bg-orange-700" : "bg-zinc-200 dark:bg-zinc-700",
                )}
              >
                <Text
                  className={clsx(
                    "text-xs font-bold",
                    done ? "text-white" : "text-zinc-600 dark:text-zinc-300",
                  )}
                >
                  {WEEKDAYS[index]?.charAt(0)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Fact>
    </View>
  );
};
