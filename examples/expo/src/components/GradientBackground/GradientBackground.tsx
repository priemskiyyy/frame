import type React from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type GradientBackgroundProps = {
  from: string;
  to: string;
};

/** A diagonal gradient behind its siblings, drawn with SVG so it needs no native module of its own. */
export const GradientBackground: React.FunctionComponent<
  GradientBackgroundProps
> = ({ from, to }) => (
  <Svg
    accessible={false}
    width="100%"
    height="100%"
    preserveAspectRatio="none"
    style={{ position: "absolute" }}
  >
    <Defs>
      <LinearGradient id="background" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={from} />
        <Stop offset="1" stopColor={to} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#background)" />
  </Svg>
);
