import type React from "react";
import { Text, View } from "react-native";

import { OutcomeBadge } from "src/components/OutcomeBadge/OutcomeBadge";
import type { LedgerEntry } from "src/types/LedgerEntry";
import { explainOutcome } from "src/utils/explainOutcome";

type LatestOutcomeBarProps = {
  entry: LedgerEntry | null;
};

/** Pinned under the page so the answer to the last press is in view wherever the page is scrolled to. */
export const LatestOutcomeBar: React.FunctionComponent<
  LatestOutcomeBarProps
> = ({ entry }) => {
  if (entry === null) {
    return (
      <View className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          Latest outcome: nothing yet. Press Publish and it appears here.
        </Text>
      </View>
    );
  }

  return (
    <View
      role="status"
      aria-live="polite"
      className="gap-1 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text
          numberOfLines={1}
          className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {entry.label}
        </Text>
        <OutcomeBadge status={entry.outcome.status} />
      </View>
      <Text
        numberOfLines={2}
        className="text-xs text-zinc-600 dark:text-zinc-400"
      >
        {explainOutcome(entry.outcome)}
      </Text>
    </View>
  );
};
