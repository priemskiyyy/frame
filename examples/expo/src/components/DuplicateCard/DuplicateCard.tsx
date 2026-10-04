import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { View } from "react-native";
import { Equals } from "phosphor-react-native/src/icons/Equals";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { projectStreak } from "src/domain/projectStreak";
import type { Streak } from "src/types/Streak";

type DuplicateCardProps = {
  streak: Streak;
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

export const DuplicateCard: React.FunctionComponent<DuplicateCardProps> = ({
  streak,
  onOutcome,
}) => {
  const widget = useWidget("streak");

  const handleTwicePress = () => {
    const data = projectStreak(streak, Date.now());

    widget
      .publish(data)
      .then((outcome) => onOutcome("Publish the content", outcome))
      .then(() => widget.publish(data))
      .then((outcome) => onOutcome("Publish it again", outcome));
  };

  const handleForcePress = () => {
    const data = projectStreak(streak, Date.now());

    widget
      .publish(data)
      .then((outcome) => onOutcome("Publish the content", outcome))
      .then(() => widget.publish(data, { force: true }))
      .then((outcome) => onOutcome("Publish it again, forced", outcome));
  };

  return (
    <Card
      title="Duplicates"
      description="Equal content is compared by its canonical form, so key order does not matter. Frame skips what is already submitted, and never against a failed or uncertain submission."
      icon={Equals}
    >
      <View className="flex-row gap-3">
        <View className="flex-1">
          <ActionButton
            label="Publish twice"
            variant="primary"
            onPress={handleTwicePress}
          />
        </View>
        <View className="flex-1">
          <ActionButton
            label="Force the second"
            variant="neutral"
            onPress={handleForcePress}
          />
        </View>
      </View>
    </Card>
  );
};
