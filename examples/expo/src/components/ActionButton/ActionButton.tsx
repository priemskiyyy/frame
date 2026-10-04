import type React from "react";
import type { Icon } from "phosphor-react-native";
import { Pressable, Text } from "react-native";
import { cva } from "class-variance-authority";

import { useScheme } from "src/hooks/useScheme";
import { getToneColor } from "src/utils/getToneColor";
import { haptic } from "src/utils/haptic";

const buttonStyles = cva(
  "min-h-11 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5 active:opacity-70",
  {
    variants: {
      variant: {
        primary: "bg-orange-700",
        neutral:
          "border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
        danger: "bg-rose-700",
      },
      disabled: { true: "opacity-40", false: "" },
    },
  },
);

const labelStyles = cva("text-sm font-semibold", {
  variants: {
    variant: {
      primary: "text-white",
      neutral: "text-zinc-800 dark:text-zinc-100",
      danger: "text-white",
    },
  },
});

type ActionButtonProps = {
  label: string;
  variant: "primary" | "neutral" | "danger";
  icon?: Icon;
  disabled?: boolean;
  onPress: () => void;
};

export const ActionButton: React.FunctionComponent<ActionButtonProps> = ({
  label,
  variant,
  icon: ButtonIcon,
  disabled = false,
  onPress,
}) => {
  const scheme = useScheme();

  const handlePress = () => {
    haptic();
    onPress();
  };

  const iconColor =
    variant === "neutral" ? getToneColor("neutral", scheme) : "#ffffff";

  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      className={buttonStyles({ variant, disabled })}
      onPress={handlePress}
    >
      {ButtonIcon === undefined ? null : (
        <ButtonIcon size={16} weight="bold" color={iconColor} />
      )}
      <Text className={labelStyles({ variant })}>{label}</Text>
    </Pressable>
  );
};
