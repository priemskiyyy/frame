import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { Lightning } from "phosphor-react-native/src/icons/Lightning";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { projectStreak } from "src/domain/projectStreak";
import type { Streak } from "src/types/Streak";
import { BURST_SIZE } from "src/utils/constants/burst";

type BurstCardProps = {
  streak: Streak;
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

export const BurstCard: React.FunctionComponent<BurstCardProps> = ({
  streak,
  onOutcome,
}) => {
  const widget = useWidget("streak");

  const handleBurstPress = () => {
    for (let step = 1; step <= BURST_SIZE; step += 1) {
      widget
        .publish(
          projectStreak({ ...streak, days: streak.days + step }, Date.now()),
        )
        .then((outcome) =>
          onOutcome(`Burst ${step} of ${BURST_SIZE}`, outcome),
        );
    }
  };

  return (
    <Card
      title="Ordering"
      description="Frame orders requests by when you made them, and one native widget takes one write at a time. A request still waiting when a newer one arrives is replaced, never sent."
      icon={Lightning}
    >
      <ActionButton
        label={`Send ${BURST_SIZE} updates in a row`}
        variant="primary"
        icon={Lightning}
        onPress={handleBurstPress}
      />
    </Card>
  );
};
