import type React from "react";
import { Text, View } from "react-native";
import { SealCheck } from "phosphor-react-native/src/icons/SealCheck";

import { Card } from "src/components/Card/Card";
import { OutcomeBadge } from "src/components/OutcomeBadge/OutcomeBadge";
import { OUTCOME_MEANINGS, OUTCOME_ORDER } from "src/utils/constants/outcomes";

export const OutcomeLegend: React.FunctionComponent = () => (
  <Card
    title="What each outcome means"
    description={`${OUTCOME_ORDER.length} ways a request can end. None of them says the widget is on screen.`}
    icon={SealCheck}
  >
    <View role="list" aria-label="Outcomes" className="gap-3">
      {OUTCOME_ORDER.map((status) => (
        <View key={status} role="listitem" className="gap-1">
          <OutcomeBadge status={status} />
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
            {OUTCOME_MEANINGS[status]}
          </Text>
        </View>
      ))}
    </View>
  </Card>
);
