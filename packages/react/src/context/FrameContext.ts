import { createContext } from "react";

import type { RegisteredFrame } from "src/types/Register";

export const FrameContext = createContext<RegisteredFrame | undefined>(
  undefined,
);
