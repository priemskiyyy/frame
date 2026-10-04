import { Pressable, Text, View } from "react-native";
import clsx from "clsx";

import { haptic } from "src/utils/haptic";

type SegmentedControlProps<TId extends string> = {
  label: string;
  options: { id: TId; label: string }[];
  selected: TId;
  onSelect: (id: TId) => void;
};

export const SegmentedControl = <TId extends string>({
  label,
  options,
  selected,
  onSelect,
}: SegmentedControlProps<TId>) => (
  <View
    accessibilityRole="radiogroup"
    aria-label={label}
    className="flex-row gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
  >
    {options.map((option) => {
      const active = option.id === selected;

      const handlePress = () => {
        if (active) {
          return;
        }

        haptic();
        onSelect(option.id);
      };

      return (
        <Pressable
          key={option.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: active }}
          className={clsx(
            "min-h-11 flex-1 items-center justify-center rounded-lg px-3",
            active ? "bg-white dark:bg-zinc-950" : "",
          )}
          onPress={handlePress}
        >
          <Text
            className={clsx(
              "text-sm font-semibold",
              active
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-600 dark:text-zinc-400",
            )}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);
