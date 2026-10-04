/** Why the adapter is unavailable: Voltra is not on an Apple platform, or the application said it is not available. */
export const NOT_APPLE_REASON =
  "Voltra cannot host widgets here: it is not running on an Apple platform, where its widget functions would resolve without doing anything, or the application's own `available` said no.";

/** What to do about a runtime that is not Apple. */
export const NOT_APPLE_REMEDIATION =
  "Run the app on iOS in a development build that includes the @use-voltra/ios-client config plugin. Android and web cannot host these widgets.";
