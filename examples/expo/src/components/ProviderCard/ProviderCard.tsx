import type React from "react";
import { useFrame, useWidgetStatus } from "@priemskiyyy/frame-react";
import { Text } from "react-native";
import { Plugs } from "phosphor-react-native/src/icons/Plugs";
import { match } from "ts-pattern";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Card } from "src/components/Card/Card";
import { HintStrip } from "src/components/HintStrip/HintStrip";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import type { Provider } from "src/types/Provider";
import {
  PROVIDER_DESCRIPTIONS,
  PROVIDER_IDS,
  PROVIDER_LABELS,
} from "src/utils/constants/providers";

type ProviderCardProps = {
  provider: Provider;
  onProviderSelect: (provider: Provider) => void;
};

export const ProviderCard: React.FunctionComponent<ProviderCardProps> = ({
  provider,
  onProviderSelect,
}) => {
  const frame = useFrame();
  const { lifecycle } = useWidgetStatus("streak");

  const handlePreparePress = () => {
    frame.prepare();
  };

  return (
    <Card
      title="Provider"
      description="One Frame per provider. Publishing drives whichever one you pick here."
      icon={Plugs}
    >
      <SegmentedControl
        label="Provider"
        options={PROVIDER_IDS.map((id) => ({ id, label: PROVIDER_LABELS[id] }))}
        selected={provider}
        onSelect={onProviderSelect}
      />
      <Text className="text-sm text-zinc-600 dark:text-zinc-400">
        {PROVIDER_DESCRIPTIONS[provider]}
      </Text>
      {match(lifecycle)
        .with({ state: "unavailable" }, ({ reason, remediation }) => (
          <HintStrip message={`${reason} ${remediation ?? ""}`.trim()} />
        ))
        .with({ state: "failed" }, ({ error }) => (
          <HintStrip message={`Opening threw: ${error.message}`} />
        ))
        .otherwise(() => null)}
      <ActionButton
        label="Open the adapter now"
        variant="neutral"
        onPress={handlePreparePress}
      />
    </Card>
  );
};
