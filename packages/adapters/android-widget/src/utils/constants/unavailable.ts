/** What the adapter says when the application's `available` answers no. */
export const NOT_AVAILABLE_REASON =
  "The application said Android widgets are not available here.";
/** What to do about it: the SDK has no platform probe, so the application owns the answer. */
export const NOT_AVAILABLE_REMEDIATION =
  "Return true from `available` only where react-native-android-widget runs, such as when Platform.OS is android.";
