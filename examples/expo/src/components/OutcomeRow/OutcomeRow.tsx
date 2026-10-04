import type React from "react";
import { Text, View } from "react-native";

import { OutcomeBadge } from "src/components/OutcomeBadge/OutcomeBadge";
import type { LedgerEntry } from "src/types/LedgerEntry";
import { PROVIDER_LABELS } from "src/utils/constants/providers";
import { explainOutcome } from "src/utils/explainOutcome";
import { formatClockTime } from "src/utils/formatClockTime";
import { getOutcomeDetail } from "src/utils/getOutcomeDetail";

type OutcomeRowProps = {
  entry: LedgerEntry;
};

export const OutcomeRow: React.FunctionComponent<OutcomeRowProps> = ({
  entry,
}) => {
  const detail = getOutcomeDetail(entry.outcome);

  return (
    <View
      role="listitem"
      className="gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800"
    >
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {entry.label}
        </Text>
        <OutcomeBadge status={entry.outcome.status} />
      </View>
      <Text className="text-xs text-zinc-600 dark:text-zinc-400">
        {explainOutcome(entry.outcome)}
      </Text>
      <Text className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
        {`${formatClockTime(entry.at)} · ${entry.outcome.request.id} · ${PROVIDER_LABELS[entry.provider]}${detail === null ? "" : ` · ${detail}`}`}
      </Text>
    </View>
  );
};
