import * as Haptics from "expo-haptics";
import { AccessibilityInfo } from "react-native";

import type { Tone } from "src/types/Tone";

const FEEDBACK = {
  neutral: null,
  info: null,
  positive: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  danger: Haptics.NotificationFeedbackType.Error,
} satisfies Record<Tone, Haptics.NotificationFeedbackType | null>;

/** Lets a new outcome be heard and felt as well as read: spoken by a screen reader, and a success, a warning or an error for the loud tones. */
export const notifyOutcome = (tone: Tone, announcement: string) => {
  const feedback = FEEDBACK[tone];

  AccessibilityInfo.announceForAccessibility(announcement);

  if (feedback === null) {
    return;
  }

  Haptics.notificationAsync(feedback).catch(() => {});
};
