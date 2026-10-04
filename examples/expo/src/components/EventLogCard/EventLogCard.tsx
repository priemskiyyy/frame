import type React from "react";
import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { Terminal } from "phosphor-react-native/src/icons/Terminal";

import { Card } from "src/components/Card/Card";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { ToneDot } from "src/components/ToneDot/ToneDot";
import { EVENT_LOGS } from "src/frames/eventLogs";
import type { Provider } from "src/types/Provider";
import { describeEvent } from "src/utils/describeEvent";
import { formatClockTime } from "src/utils/formatClockTime";

type EventLogCardProps = {
  provider: Provider;
};

export const EventLogCard: React.FunctionComponent<EventLogCardProps> = ({
  provider,
}) => {
  const log = EVENT_LOGS[provider];
  const events = useSyncExternalStore(log.subscribe, log.get);

  return (
    <Card
      title="Diagnostics"
      description="Frame's own event stream, newest first. It names widgets and requests and never carries a value you published."
      icon={Terminal}
    >
      {events.length === 0 ? (
        <EmptyState message="No events yet. Do anything above." />
      ) : (
        <View role="list" aria-label="Events" className="gap-2">
          {events.map(({ id, event }) => {
            const { label, detail, tone } = describeEvent(event);

            return (
              <View
                key={id}
                role="listitem"
                className="flex-row items-start gap-2"
              >
                <View className="pt-1.5">
                  <ToneDot tone={tone} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {label}
                  </Text>
                  <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                    {detail}
                  </Text>
                </View>
                <Text className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  {formatClockTime(event.timestamp)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
};
