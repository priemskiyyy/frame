import type React from "react";
import { FrameProvider } from "@priemskiyyy/frame-react";
import { useReducer } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Studio } from "src/components/Studio/Studio";
import { applicationReducer } from "src/state/applicationReducer";
import { initialApplicationState } from "src/state/initialApplicationState";
import { FRAMES } from "src/frames/frames";
import "src/global.css";

export const Application: React.FunctionComponent = () => {
  const [state, act] = useReducer(applicationReducer, initialApplicationState);

  return (
    <SafeAreaProvider>
      <FrameProvider frame={FRAMES[state.provider]}>
        <Studio state={state} act={act} />
      </FrameProvider>
    </SafeAreaProvider>
  );
};
