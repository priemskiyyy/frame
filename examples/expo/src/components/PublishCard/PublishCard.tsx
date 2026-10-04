import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { useState } from "react";
import { View } from "react-native";
import { ArrowCounterClockwise } from "phosphor-react-native/src/icons/ArrowCounterClockwise";
import { PaperPlaneTilt } from "phosphor-react-native/src/icons/PaperPlaneTilt";
import { Flame } from "phosphor-react-native/src/icons/Flame";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { LifecycleFacts } from "src/components/LifecycleFacts/LifecycleFacts";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { StreakEditor } from "src/components/StreakEditor/StreakEditor";
import { WidgetPreview } from "src/components/WidgetPreview/WidgetPreview";
import { projectStreak } from "src/domain/projectStreak";
import type { AccountId } from "src/types/AccountId";
import type { PreviewFamily } from "src/types/PreviewFamily";
import type { Streak } from "src/types/Streak";
import { ACCOUNTS } from "src/utils/constants/accounts";
import {
  PREVIEW_FAMILY_IDS,
  PREVIEW_FAMILY_LABELS,
} from "src/utils/constants/previewFamilies";

type PublishCardProps = {
  account: AccountId;
  streak: Streak;
  onStreakChange: (streak: Streak) => void;
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

export const PublishCard: React.FunctionComponent<PublishCardProps> = ({
  account,
  streak,
  onStreakChange,
  onOutcome,
}) => {
  const widget = useWidget("streak");
  const [family, setFamily] = useState<PreviewFamily>("systemSmall");

  const handlePublishPress = () => {
    widget
      .publish(projectStreak(streak, Date.now()))
      .then((outcome) =>
        onOutcome(`Publish ${streak.habit}, ${streak.days} days`, outcome),
      );
  };

  const handleResetPress = () => {
    widget
      .reset()
      .then((outcome) => onOutcome("Reset to the fallback", outcome));
  };

  return (
    <Card
      title={`${ACCOUNTS[account].name}'s widget`}
      description="Edit the streak the app keeps, then publish its projection. The preview shows what Frame wants shown."
      icon={Flame}
    >
      <SegmentedControl
        label="Widget size"
        options={PREVIEW_FAMILY_IDS.map((id) => ({
          id,
          label: PREVIEW_FAMILY_LABELS[id],
        }))}
        selected={family}
        onSelect={setFamily}
      />
      <View className="items-center">
        <WidgetPreview family={family} />
      </View>
      <LifecycleFacts />
      <StreakEditor streak={streak} onChange={onStreakChange} />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <ActionButton
            label="Publish"
            variant="primary"
            icon={PaperPlaneTilt}
            onPress={handlePublishPress}
          />
        </View>
        <View className="flex-1">
          <ActionButton
            label="Reset"
            variant="neutral"
            icon={ArrowCounterClockwise}
            onPress={handleResetPress}
          />
        </View>
      </View>
    </Card>
  );
};
