import type React from "react";
import { useWidgetData } from "@priemskiyyy/frame-react";
import { View } from "react-native";
import clsx from "clsx";
import { match } from "ts-pattern";

import { GradientBackground } from "src/components/GradientBackground/GradientBackground";
import { PreviewEmpty } from "src/components/PreviewEmpty/PreviewEmpty";
import { PreviewReady } from "src/components/PreviewReady/PreviewReady";
import type { PreviewFamily } from "src/types/PreviewFamily";
import { PREVIEW_FAMILY_ASPECTS } from "src/utils/constants/previewFamilies";

type WidgetPreviewProps = {
  family: PreviewFamily;
};

/** An approximation of the home screen widget: what Frame wants shown, drawn by React Native, not the host. */
export const WidgetPreview: React.FunctionComponent<WidgetPreviewProps> = ({
  family,
}) => {
  const data = useWidgetData("streak");
  const ready = data !== null && data.state === "ready";

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={match(data)
        .with(
          { state: "ready" },
          ({ habit, days }) => `Preview: ${habit}, ${days} day streak`,
        )
        .otherwise(() => "Preview: no streak yet")}
      className={clsx(
        "overflow-hidden rounded-[28px]",
        family === "systemSmall" ? "w-40" : "w-full",
      )}
      style={{ aspectRatio: PREVIEW_FAMILY_ASPECTS[family] }}
    >
      <GradientBackground
        from={ready ? "#c2410c" : "#1f2937"}
        to={ready ? "#9f1239" : "#111827"}
      />
      {match(data)
        .with({ state: "ready" }, (value) => (
          <PreviewReady data={value} family={family} />
        ))
        .otherwise(() => (
          <PreviewEmpty />
        ))}
    </View>
  );
};
