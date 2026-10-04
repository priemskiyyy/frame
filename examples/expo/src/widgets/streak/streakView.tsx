import { Circle, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";

import type { StreakData } from "src/types/StreakData";

// The widget runtime evaluates this function alone, as source, in its own
// JavaScript context: the components and modifiers above are globals there,
// and nothing else from this module exists. Native may also call it with an
// empty record before the first publication, which the first branch covers.
export const StreakView = (
  props: StreakData,
  environment: WidgetEnvironment<undefined>,
) => {
  "widget";

  if (props.state !== "ready") {
    return (
      <VStack
        spacing={6}
        modifiers={[
          containerBackground(
            {
              type: "linearGradient",
              colors: ["#1f2937", "#111827"],
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 1, y: 1 },
            },
            "widget",
          ),
          accessibilityLabel("No streak yet. Open Frame Studio to start one."),
        ]}
      >
        <Image systemName="flame" size={28} color="#fb923c" />
        <Text
          modifiers={[
            font({ size: 15, weight: "semibold", design: "rounded" }),
            foregroundStyle("#f9fafb"),
          ]}
        >
          No streak yet
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#9ca3af")]}>
          Open Frame Studio
        </Text>
      </VStack>
    );
  }

  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  const isSmall = environment.widgetFamily === "systemSmall";

  const dots = props.week.map((done, index) => (
    <VStack key={index} spacing={3}>
      <Circle
        modifiers={[
          frame({ width: 10, height: 10 }),
          foregroundStyle(done ? "#fef3c7" : "#00000040"),
        ]}
      />
      <Text
        modifiers={[
          font({ size: 9, weight: "medium" }),
          foregroundStyle("#ffffffe6"),
        ]}
      >
        {letters[index]}
      </Text>
    </VStack>
  ));

  const count = (
    <VStack alignment="leading" spacing={0}>
      <Text
        modifiers={[
          font({ size: isSmall ? 12 : 13, weight: "semibold" }),
          foregroundStyle("#ffffffe6"),
        ]}
      >
        {props.habit}
      </Text>
      <Text
        modifiers={[
          font({
            size: isSmall ? 46 : 56,
            weight: "bold",
            design: "rounded",
          }),
          foregroundStyle("#ffffff"),
        ]}
      >
        {`${props.days}`}
      </Text>
      <Text
        modifiers={[
          font({ size: 12, weight: "medium" }),
          foregroundStyle("#ffffffe6"),
        ]}
      >
        {`day streak · best ${props.best}`}
      </Text>
    </VStack>
  );

  const updated = (
    <Text
      date={new Date(props.updatedAt)}
      dateStyle="relative"
      modifiers={[font({ size: 10 }), foregroundStyle("#ffffffcc")]}
    />
  );

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 0 }),
        containerBackground(
          {
            type: "linearGradient",
            colors: ["#c2410c", "#9f1239"],
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 1, y: 1 },
          },
          "widget",
        ),
        accessibilityLabel(
          `${props.habit}, ${props.days} day streak, best ${props.best}`,
        ),
      ]}
    >
      {isSmall ? (
        <VStack alignment="leading" spacing={6}>
          {count}
          <HStack spacing={4}>{dots}</HStack>
        </VStack>
      ) : (
        <HStack spacing={16}>
          {count}
          <Spacer />
          <VStack alignment="trailing" spacing={8}>
            <HStack spacing={4}>{dots}</HStack>
            {updated}
          </VStack>
        </HStack>
      )}
    </VStack>
  );
};
