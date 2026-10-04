import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { useState } from "react";
import { Text } from "react-native";
import { Users } from "phosphor-react-native/src/icons/Users";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { projectStreak } from "src/domain/projectStreak";
import { FRAMES } from "src/frames/frames";
import type { AccountId } from "src/types/AccountId";
import type { Provider } from "src/types/Provider";
import type { Streak } from "src/types/Streak";
import type { StreakHandle } from "src/types/StreakHandle";
import { ACCOUNT_IDS, ACCOUNTS } from "src/utils/constants/accounts";
import { PROVIDER_IDS } from "src/utils/constants/providers";

type AccountCardProps = {
  account: AccountId;
  provider: Provider;
  streaks: Record<AccountId, Streak>;
  onAccountSelect: (account: AccountId) => void;
  onOutcome: (label: string, outcome: PublicationOutcome) => void;
};

/** Keyed by provider where it is rendered, so the handle it holds never outlives the Frame it came from. */
export const AccountCard: React.FunctionComponent<AccountCardProps> = ({
  account,
  provider,
  streaks,
  onAccountSelect,
  onOutcome,
}) => {
  const widget = useWidget("streak");

  // The handle the page held before the last switch, and whose account it was.
  const [stale, setStale] = useState<{
    handle: StreakHandle;
    account: AccountId;
  } | null>(null);

  const handleAccountSelect = (next: AccountId) => {
    // Held before the switch on purpose: this is the handle that must not follow the new account.
    setStale({ handle: widget, account });
    onAccountSelect(next);

    for (const id of PROVIDER_IDS) {
      const reset = FRAMES[id].context();

      if (id !== provider) {
        continue;
      }

      reset.then(({ widgets }) => {
        if (widgets.streak === undefined) {
          return;
        }

        onOutcome(
          `Switch to ${ACCOUNTS[next].name}: reset the widget`,
          widgets.streak,
        );
      });
    }
  };

  const handleStalePress = () => {
    if (stale === null) {
      return;
    }

    stale.handle
      .publish(projectStreak(streaks[stale.account], Date.now()))
      .then((outcome) =>
        onOutcome(
          `Publish ${ACCOUNTS[stale.account].name}'s streak after switching`,
          outcome,
        ),
      );
  };

  return (
    <Card
      title="Accounts"
      description="A context change ends every handle of the context before it, at once. Switching resets the widget of every provider's Frame to its fallback, not only the one you are watching, so one account's data never lingers for the next."
      icon={Users}
    >
      <SegmentedControl
        label="Account"
        options={ACCOUNT_IDS.map((id) => ({ id, label: ACCOUNTS[id].name }))}
        selected={account}
        onSelect={handleAccountSelect}
      />
      <Text className="text-sm text-zinc-600 dark:text-zinc-400">
        {stale === null
          ? "Switch accounts, then come back here: the old handle becomes the interesting one."
          : `You switched away from ${ACCOUNTS[stale.account].name}. A slow request started before the switch still holds that account's handle.`}
      </Text>
      <ActionButton
        label="Publish with the previous handle"
        variant="danger"
        disabled={stale === null}
        onPress={handleStalePress}
      />
    </Card>
  );
};
