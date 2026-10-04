import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { Timer } from "phosphor-react-native/src/icons/Timer";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { projectStreak } from "src/domain/projectStreak";
import type { Streak } from "src/types/Streak";
import { SCHEDULE_STEPS } from "src/utils/constants/schedule";

type TimelineCardProps = {
  streak: Streak;
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

export const TimelineCard: React.FunctionComponent<TimelineCardProps> = ({
  streak,
  onOutcome,
}) => {
  const widget = useWidget("streak");

  const handleSchedulePress = () => {
    const start = Date.now();

    widget
      .publishTimeline(
        SCHEDULE_STEPS.map(({ afterMs, extraDays }) => ({
          at: start + afterMs,
          data: projectStreak(
            { ...streak, days: streak.days + extraDays },
            start + afterMs,
          ),
        })),
      )
      .then((outcome) =>
        onOutcome(`Schedule ${SCHEDULE_STEPS.length} entries`, outcome),
      );
  };

  return (
    <Card
      title="Schedule"
      description="A timeline replaces the whole schedule at once. The first entry must not be in the future, and on a real home screen the widget moves through the rest by itself, even if the app never opens again."
      icon={Timer}
    >
      <ActionButton
        label="Add a day every minute"
        variant="primary"
        icon={Timer}
        onPress={handleSchedulePress}
      />
    </Card>
  );
};
