import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

/** The safe-area view with `className` support: a third-party component needs `withUniwind` to read classes on native. */
export const Screen = withUniwind(SafeAreaView);
