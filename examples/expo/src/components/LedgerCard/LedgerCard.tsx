import type React from "react";
import { View } from "react-native";
import { ListChecks } from "phosphor-react-native/src/icons/ListChecks";
import { Trash } from "phosphor-react-native/src/icons/Trash";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { OutcomeRow } from "src/components/OutcomeRow/OutcomeRow";
import type { LedgerEntry } from "src/types/LedgerEntry";

type LedgerCardProps = {
  ledger: LedgerEntry[];
  onClearPress: () => void;
};

export const LedgerCard: React.FunctionComponent<LedgerCardProps> = ({
  ledger,
  onClearPress,
}) => (
  <Card
    title="Ledger"
    description="Every publication the page asked of Frame, newest first, with how each one ended."
    icon={ListChecks}
  >
    {ledger.length === 0 ? (
      <EmptyState message="The ledger is empty." />
    ) : (
      <View role="list" aria-label="Outcomes" className="gap-3">
        {ledger.map((entry) => (
          <OutcomeRow key={entry.id} entry={entry} />
        ))}
      </View>
    )}
    <ActionButton
      label="Clear the ledger"
      variant="neutral"
      icon={Trash}
      disabled={ledger.length === 0}
      onPress={onClearPress}
    />
  </Card>
);
