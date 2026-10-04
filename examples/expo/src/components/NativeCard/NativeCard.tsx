import type React from "react";
import type { ReadbackOutcome, ReloadOutcome } from "@priemskiyyy/frame";
import { useWidget } from "@priemskiyyy/frame-react";
import { useState } from "react";
import { Text, View } from "react-native";
import { Database } from "phosphor-react-native/src/icons/Database";

import { ActionButton } from "src/components/ActionButton/ActionButton";
import { Badge } from "src/components/Badge/Badge";
import { Card } from "src/components/Card/Card";
import { CodeBlock } from "src/components/CodeBlock/CodeBlock";
import { HintStrip } from "src/components/HintStrip/HintStrip";
import { OutcomeBadge } from "src/components/OutcomeBadge/OutcomeBadge";
import { simulatedProvider } from "src/frames/simulatedProvider";
import type { Provider } from "src/types/Provider";
import type { StreakData } from "src/types/StreakData";
import { explainOutcome } from "src/utils/explainOutcome";
import { getOutcomeEvidence } from "src/utils/getOutcomeEvidence";

type NativeCardProps = {
  provider: Provider;
};

/** Keyed by provider and account where it is rendered, so what it read never outlives what it read it from. */
export const NativeCard: React.FunctionComponent<NativeCardProps> = ({
  provider,
}) => {
  const widget = useWidget("streak");

  const [readback, setReadback] = useState<ReadbackOutcome<StreakData> | null>(
    null,
  );

  const [reload, setReload] = useState<ReloadOutcome | null>(null);
  const [seeded, setSeeded] = useState(false);

  const handleReadPress = () => {
    widget.readback().then(setReadback);
  };

  const handleReloadPress = () => {
    widget.reload().then(setReload);
  };

  const handleSeedPress = () => {
    const at = Date.now();

    // One entry shaped as an older build wrote it, which today's schema refuses, and one it accepts.
    simulatedProvider.control.seed([
      { at: at - 1, data: { state: "ready", habit: "Run", days: 12 } },
      { at, data: { state: "empty" } },
    ]);
    setSeeded(true);
  };

  const evidence = reload === null ? null : getOutcomeEvidence(reload);

  return (
    <Card
      title="What the widget stores"
      description="Read back what the provider holds, parsed with the schema: data an older build wrote is counted and dropped, never cast. Or ask the host to reload."
      icon={Database}
    >
      <View className="flex-row gap-3">
        <View className="flex-1">
          <ActionButton
            label="Read it back"
            variant="primary"
            onPress={handleReadPress}
          />
        </View>
        <View className="flex-1">
          <ActionButton
            label="Request a reload"
            variant="neutral"
            onPress={handleReloadPress}
          />
        </View>
      </View>
      {provider === "simulated" ? (
        <ActionButton
          label="Seed an older build"
          variant="neutral"
          onPress={handleSeedPress}
        />
      ) : null}
      {seeded ? (
        <HintStrip message="Seeded two entries behind Frame's back: one shaped as an older build wrote it, one current. Read it back to see one rejected." />
      ) : null}
      {readback === null ? null : (
        <View className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            {readback.status === "read" ? (
              <Badge tone="positive">Read</Badge>
            ) : (
              <OutcomeBadge status={readback.status} />
            )}
            <Text className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
              {readback.status === "read"
                ? `${readback.entries.length} stored entries parse with the schema, ${readback.rejected} do not.`
                : explainOutcome(readback)}
            </Text>
          </View>
          {readback.status === "read" && readback.entries.length > 0 ? (
            <CodeBlock>{JSON.stringify(readback.entries, null, 2)}</CodeBlock>
          ) : null}
        </View>
      )}
      {reload === null ? null : (
        <View className="flex-row flex-wrap items-center gap-2">
          <OutcomeBadge status={reload.status} />
          <Text className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
            {evidence === null
              ? explainOutcome(reload)
              : `${evidence}. The host was asked to reload, which is an acknowledgement and not a redraw.`}
          </Text>
        </View>
      )}
    </Card>
  );
};
