import type React from "react";
import { Text, View } from "react-native";

import { GuideStep } from "src/components/GuideStep/GuideStep";
import { Heading } from "src/components/Heading/Heading";
import type { ApplicationState } from "src/state/ApplicationState";

type HeroProps = {
  milestones: ApplicationState["milestones"];
};

export const Hero: React.FunctionComponent<HeroProps> = ({ milestones }) => {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
          A Frame demo
        </Text>
        <Heading level={1}>Publish once. Know what Frame knows.</Heading>
        <Text className="text-base text-zinc-600 dark:text-zinc-400">
          Frame Studio publishes a habit streak to a home screen widget. Every
          request ends in an honest outcome, and bad data never reaches the
          provider.
        </Text>
      </View>
      <View role="list" aria-label="How to use this page" className="gap-3">
        <GuideStep
          number={1}
          title="Publish the streak"
          description="Edit it, press Publish, and add the Habit streak widget to your home screen."
          done={milestones.published}
        />
        <GuideStep
          number={2}
          title="Break it on purpose"
          description="Send bad data or a burst of updates and read how Frame refuses or replaces them."
          done={milestones.refused}
        />
        <GuideStep
          number={3}
          title="Switch accounts"
          description="Publish with the previous account's handle after a switch: it expires instead of leaking."
          done={milestones.fenced}
        />
      </View>
    </View>
  );
};
