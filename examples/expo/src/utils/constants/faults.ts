import type { Fault } from "src/types/Fault";
import { SIMULATED_TIMEOUT } from "src/utils/constants/simulated";

/** The faults the simulated provider can be armed with, each one a way a real provider call goes wrong. */
export const FAULTS = [
  {
    id: "fail",
    label: "Next call fails",
    note: "The next publish fails before the provider hears of it.",
    plan: {
      outcome: "fail",
      error: new Error("Simulated: the provider refused"),
    },
  },
  {
    id: "crash",
    label: "Next call crashes",
    note: "The next publish crashes inside the provider: effects unknown.",
    plan: {
      outcome: "throw",
      error: new Error("Simulated: the native call crashed"),
    },
  },
  {
    id: "quiet",
    label: "Next call goes quiet",
    note: `The next publish goes quiet. After ${SIMULATED_TIMEOUT / 1000} seconds Frame stops waiting, ends it indeterminate and blocks the write domain.`,
    plan: { outcome: "hold" },
  },
  {
    id: "skip",
    label: "Next call finds no widget",
    note: "The next publish finds no placed widget, so nothing is drawn and it ends skipped.",
    plan: { outcome: "skip" },
  },
] satisfies Fault[];
