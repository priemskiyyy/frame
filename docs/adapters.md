---
description: Which providers Frame supports, what each one provides, and how a widget picks the adapter that hosts it.
---

# Adapters

An adapter draws one widget through one provider. Frame never imports a provider: you pass the SDK your application already configured, and the adapter names, structurally, only what it calls.

## The providers

| Package                             | Provider                                                    | Platforms | Provides                             | Evidence               |
| ----------------------------------- | ----------------------------------------------------------- | --------- | ------------------------------------ | ---------------------- |
| `@priemskiyyy/frame-expo`           | `expo-widgets` 57                                           | iOS       | snapshot, timeline, reload, readback | `sdk-call-returned`    |
| `@priemskiyyy/frame-voltra-ios`     | `@use-voltra/ios-client` 2.3.2 and later 2.x (payload mode) | iOS       | snapshot, timeline, reload           | `sdk-promise-resolved` |
| `@priemskiyyy/frame-android-widget` | `react-native-android-widget` 0.22                          | Android   | snapshot                             | `sdk-call-returned`    |

Each package's README lists how a call is mapped and what Frame does not normalize. An operation a provider does not offer answers `unavailable` on every handle, so the code that calls it does not change per platform.

## One Frame for every platform

List the adapters in the order you prefer. Each widget is hosted by the first of its adapters whose `open` answers a session:

```ts
export const frame = new Frame({
  widgets: { streak },
  adapters: [
    expoWidget(streak, { sdk: ExpoWidgets, render: StreakView }),
    androidWidget(streak, {
      sdk: AndroidWidgets,
      render: StreakCard,
      available: () => Platform.OS === "android",
    }),
  ],
});
```

On iOS the Expo adapter opens and the Android one is never opened. On Android the Expo adapter answers `unavailable` because `expo-widgets` reports no shared directory there, so the Android adapter is tried. Where none can work, the widget answers `unavailable` with every reason, so the user interface can say why:

```ts
const outcome = await frame
  .widget("streak")
  .publish({ habit: "Run", days: 12 });

if (outcome.status === "unavailable") {
  console.log(outcome.reason, outcome.remediation);
}
```

An adapter that throws while opening is not skipped. The search stops, the request ends `failed`, and the next publish opens the adapters again from the start.

## How an adapter knows it cannot work

| Adapter        | How it knows                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo           | `expo-widgets` reports no shared widgets directory: no native side, or no App Group.                                                                       |
| Voltra iOS     | Voltra's own `assertRunningOnApple`, the check its widget functions use before they do anything, or the application's `available` when it gives one.       |
| Android widget | You say so with `available`, which is required. The SDK has no platform probe, and off Android it lists no widgets, which would read as `skipped` forever. |

Which adapter hosts a widget is in `frame.diagnostics.get().widgets.streak.adapter`.

## When a provider cannot be imported

Whether a provider can be imported where it does not run varies, so check before you rely on it:

- `expo-widgets` ships a stub for Android and the web, so importing it there is safe. On an iOS binary without its native module, such as Expo Go, importing it throws before any adapter exists.
- `@use-voltra/ios-client` has no stub. Its native component is registered when the module loads, and `react-native-web` provides no such registry, so importing it on the web is expected to throw.
- `react-native-android-widget` imports everywhere and lists no widgets off Android.

When a provider cannot be imported on a platform, give the Frame only the adapters that are safe there, with a platform file extension:

```ts
// frame.ios.ts
export const frame = new Frame({
  widgets: { streak },
  adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
});
```

```ts
// frame.ts, resolved on every other platform
export const frame = new Frame({ widgets: { streak } });
```

A Frame with no adapters is valid and answers `unavailable`. Both files have the same type, because adapters are not part of it, so one `Register` declaration covers both.

## Choosing none

A web build, a server render or a test that must not touch a provider takes a Frame with no adapters, or the mock adapter. Nothing else changes.

## Writing your own

See [writing an adapter](writing-an-adapter.md).
