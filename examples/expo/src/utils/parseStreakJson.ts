import type { StreakData } from "src/types/StreakData";

type Parsed =
  | { status: "parsed"; value: StreakData }
  | { status: "malformed"; message: string };

/**
 * Reads text a person typed. JSON.parse answers any, so the value is only
 * claimed to be a StreakData: this is the edge an app has with untrusted
 * input, and Frame validates what it is handed before anything leaves.
 */
export const parseStreakJson = (text: string): Parsed => {
  try {
    const value: StreakData = JSON.parse(text);

    return { status: "parsed", value };
  } catch (error) {
    return {
      status: "malformed",
      message: error instanceof Error ? error.message : "That is not JSON.",
    };
  }
};
