import { useColorScheme } from "react-native";

/** The active colour scheme, defaulting to light when the platform reports none. */
export const useScheme = () => {
  if (useColorScheme() === "dark") {
    return "dark";
  }

  return "light";
};
