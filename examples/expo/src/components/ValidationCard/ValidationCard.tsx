import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import clsx from "clsx";
import { ShieldCheck } from "phosphor-react-native/src/icons/ShieldCheck";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { RAW_PRESETS } from "src/utils/constants/rawPresets";
import { haptic } from "src/utils/haptic";
import { parseStreakJson } from "src/utils/parseStreakJson";

type ValidationCardProps = {
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

export const ValidationCard: React.FunctionComponent<ValidationCardProps> = ({
  onOutcome,
}) => {
  const widget = useWidget("streak");
  const [text, setText] = useState(RAW_PRESETS[0]?.text ?? "{}");
  const selected = RAW_PRESETS.find((preset) => preset.text === text)?.id;
  const [malformed, setMalformed] = useState<string | null>(null);

  const handlePublishPress = () => {
    // The answer is in the bar under the page, which the keyboard would cover.
    Keyboard.dismiss();

    const parsed = parseStreakJson(text);

    if (parsed.status === "malformed") {
      setMalformed(parsed.message);

      return;
    }

    setMalformed(null);
    widget
      .publish(parsed.value)
      .then((outcome) => onOutcome("Publish raw JSON", outcome));
  };

  return (
    <Card
      title="Trust boundary"
      description="Text from outside is only claimed to be a streak. Frame checks it against the schema before anything reaches the provider."
      icon={ShieldCheck}
    >
      <View className="flex-row flex-wrap gap-2">
        {RAW_PRESETS.map((preset) => {
          const handlePresetPress = () => {
            haptic();
            setText(preset.text);
            setMalformed(null);
          };

          return (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === preset.id }}
              className={clsx(
                "min-h-11 justify-center rounded-full border px-4 active:opacity-70",
                selected === preset.id
                  ? "border-orange-600 bg-orange-50 dark:bg-orange-950/40"
                  : "border-zinc-300 dark:border-zinc-700",
              )}
              onPress={handlePresetPress}
            >
              <Text className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Raw JSON to publish"
        className="min-h-24 rounded-xl bg-zinc-100 p-3 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
        value={text}
        onChangeText={setText}
      />
      {malformed === null ? null : (
        <Text className="text-sm text-rose-700 dark:text-rose-300">
          {`Not JSON, so nothing was sent: ${malformed}`}
        </Text>
      )}
      <ActionButton
        label="Publish this JSON"
        variant="primary"
        onPress={handlePublishPress}
      />
    </Card>
  );
};
