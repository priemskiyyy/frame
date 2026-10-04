/** Why the adapter is unavailable when the module reports no App Group on a platform that has a native side. */
export const NO_APP_GROUP_REASON =
  "expo-widgets reports no shared widgets directory: the App Group is not configured.";

/** What to do about a missing App Group. */
export const NO_APP_GROUP_REMEDIATION =
  "Set groupIdentifier in the expo-widgets config plugin, and rebuild the development build.";

/** Why the adapter is unavailable where the module has no native side. */
export const NO_NATIVE_SIDE_REASON =
  "expo-widgets has no native side on this platform, so it cannot host widgets.";

/** What to do about a platform with no native side. */
export const NO_NATIVE_SIDE_REMEDIATION =
  "Run an iOS development build that includes the expo-widgets config plugin. Expo Go, Android and the web cannot host these widgets.";

/** Why a value is refused before it reaches expo-widgets: its storage is a property list. */
export const NULL_REFUSED_MESSAGE =
  "expo-widgets stores widget data as a property list, which cannot hold null";
