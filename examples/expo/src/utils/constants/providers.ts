import type { Provider } from "src/types/Provider";

/** What each provider is called, in the switcher, the ledger and the cards. */
export const PROVIDER_LABELS = {
  device: "Home screen",
  simulated: "Simulated",
  unhosted: "Unhosted",
} satisfies Record<Provider, string>;

/** What each provider is, in a sentence under the switcher. */
export const PROVIDER_DESCRIPTIONS = {
  device:
    "The real thing on iOS: expo-widgets writes the widget's shared storage and asks WidgetKit to reload. Add the Habit streak widget from the home screen gallery to watch it. On other platforms this Frame has no adapter and answers unavailable.",
  simulated:
    "Frame's mock provider. It answers simulated evidence, never a device, and the Provider failures card can make it hold, fail or go quiet.",
  unhosted:
    "A Frame with no adapter, as on the web. It still checks and orders what you publish, and ends every request that would reach a provider unavailable, with the reason.",
} satisfies Record<Provider, string>;

/** The providers in the order the switcher shows them. */
export const PROVIDER_IDS = [
  "device",
  "simulated",
  "unhosted",
] satisfies Provider[];
