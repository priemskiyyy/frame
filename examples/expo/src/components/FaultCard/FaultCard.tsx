import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget, useWidgetStatus } from "@priemskiyyy/frame-react";
import { useState } from "react";
import { Text, View } from "react-native";
import { Bug } from "phosphor-react-native/src/icons/Bug";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { HintStrip } from "src/components/HintStrip/HintStrip";
import { projectStreak } from "src/domain/projectStreak";
import { simulatedProvider } from "src/frames/simulatedProvider";
import type { Fault } from "src/types/Fault";
import type { Provider } from "src/types/Provider";
import type { Streak } from "src/types/Streak";
import { FAULTS } from "src/utils/constants/faults";

type FaultCardProps = {
  provider: Provider;
  streak: Streak;
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

export const FaultCard: React.FunctionComponent<FaultCardProps> = ({
  provider,
  streak,
  onOutcome,
}) => {
  const { control } = simulatedProvider;
  const widget = useWidget("streak");
  const status = useWidgetStatus("streak");

  // Scripted when Publish is pressed, so nothing else can use it up first.
  const [armed, setArmed] = useState<Fault | null>(null);

  if (provider !== "simulated") {
    return (
      <Card
        title="Provider failures"
        description="Break the provider on purpose and read how Frame reports it."
        icon={Bug}
      >
        <EmptyState message="Switch the provider to Simulated: a real widget host is not something to break." />
      </Card>
    );
  }

  const isStuck = status.work === "submitting" || status.work === "blocked";

  const handleFaultPress = (fault: Fault) => {
    setArmed(fault);
  };

  const handlePublishPress = () => {
    if (armed !== null) {
      control.script(armed.plan);
    }

    setArmed(null);
    widget
      .publish(projectStreak(streak, Date.now()), { force: true })
      .then((outcome) => onOutcome("Publish into the fault", outcome));
  };

  const handleReleasePress = () => {
    control.held()[0]?.release();
    setArmed(null);
  };

  return (
    <Card
      title="Provider failures"
      description="Arm one fault, then publish. Frame never claims a call that threw succeeded, and never lets a stuck write be overtaken."
      icon={Bug}
    >
      <View className="flex-row flex-wrap gap-2">
        {FAULTS.map((fault) => (
          <ActionButton
            key={fault.id}
            label={fault.label}
            variant={armed?.id === fault.id ? "danger" : "neutral"}
            onPress={() => handleFaultPress(fault)}
          />
        ))}
      </View>
      <ActionButton
        label="Publish now"
        variant="primary"
        onPress={handlePublishPress}
      />
      {armed === null ? null : <HintStrip message={armed.note} />}
      {status.work === "blocked" ? (
        <HintStrip message="The stuck call outlived its deadline, so its write domain is blocked. Press Publish now and the request ends blocked, never tried. Then release the held call." />
      ) : null}
      <Text className="text-sm text-zinc-600 dark:text-zinc-400">
        {`Waiting on: ${status.work}.`}
      </Text>
      <ActionButton
        label="Release the held call"
        variant="neutral"
        disabled={!isStuck}
        onPress={handleReleasePress}
      />
    </Card>
  );
};
