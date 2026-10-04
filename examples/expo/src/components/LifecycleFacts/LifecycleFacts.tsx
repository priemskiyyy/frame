import type React from "react";
import { useFrameDiagnostics, useWidgetStatus } from "@priemskiyyy/frame-react";
import { Text, View } from "react-native";
import { match } from "ts-pattern";

import { Badge } from "src/components/Badge/Badge";
import { Fact } from "src/components/Fact/Fact";

/** What Frame knows about the widget's adapter, in one place: which one hosts it, whether it opened, and what it is waiting on. */
export const LifecycleFacts: React.FunctionComponent = () => {
  const status = useWidgetStatus("streak");
  const { widgets } = useFrameDiagnostics();
  const adapter = widgets.streak.adapter;

  return (
    <>
      <Fact label="Adapter">
        <View className="flex-row items-center gap-2">
          {adapter === null ? null : (
            <Text className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {adapter.name}
            </Text>
          )}
          {match(status.lifecycle)
            .with({ state: "ready" }, () => (
              <Badge tone="positive">Ready</Badge>
            ))
            .with({ state: "idle" }, () => (
              <Badge tone="neutral">Not opened yet</Badge>
            ))
            .with({ state: "preparing" }, () => (
              <Badge tone="info">Opening</Badge>
            ))
            .with({ state: "unavailable" }, () => (
              <Badge tone="danger">Unavailable</Badge>
            ))
            .with({ state: "failed" }, () => (
              <Badge tone="danger">Open failed</Badge>
            ))
            .with({ state: "retired" }, () => (
              <Badge tone="info">Retired</Badge>
            ))
            .with({ state: "disposed" }, () => (
              <Badge tone="neutral">Disposed</Badge>
            ))
            .exhaustive()}
        </View>
      </Fact>
      <Fact label="Waiting on">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {status.work === "idle" ? "Nothing" : status.work}
        </Text>
      </Fact>
      <Fact label="Wanted by Frame">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {match(status.desired)
            .with({ state: "absent" }, () => "Nothing yet")
            .with(
              { state: "accepted" },
              ({ origin, revision }) => `revision ${revision} from ${origin}`,
            )
            .exhaustive()}
        </Text>
      </Fact>
    </>
  );
};
