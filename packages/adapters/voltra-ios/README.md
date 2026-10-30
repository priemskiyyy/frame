# @priemskiyyy/frame-voltra-ios

The Voltra iOS payload adapter for [frame](https://github.com/priemskiyyy/frame): it publishes typed, validated widget data to an iOS home screen widget through the `@use-voltra/ios-client` your application already set up. You write the Voltra JSX once as a `render` function from your data, and Frame calls `updateWidget`, `scheduleWidget` and `reloadWidgets` for you, in order, answering only what it knows. It covers Voltra's payload mode on iOS and nothing else: not Dynamic Widgets, not Live Activities, not Android.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/frame/blob/main/docs/limitations.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/frame @priemskiyyy/frame-voltra-ios @use-voltra/ios-client
```

Frame never initializes or configures Voltra. Your app keeps its own Voltra setup: the config plugin, the app group, and a widget declared with an `id` and the `supportedFamilies` you want. The package names `@use-voltra/ios-client` and `@use-voltra/ios` as optional peers at `>=2.3.2 <3` and imports neither at runtime. Its types mention `ReactNode`, so `@types/react` `>=19.2 <20` is an optional peer, as it is in every React Native app.

## Create an adapter

The definition's `name` is the widget id Voltra knows, the `id` in the plugin configuration.

```tsx
import { Frame, widget } from "@priemskiyyy/frame";
import { voltraPayloadWidget } from "@priemskiyyy/frame-voltra-ios";
import * as VoltraClient from "@use-voltra/ios-client";
import { z } from "zod";

const streak = widget({
  name: "streak",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const frame = new Frame({
  widgets: { streak },
  adapters: [
    voltraPayloadWidget(streak, {
      sdk: VoltraClient,
      render: (data) => ({
        systemSmall: (
          <VoltraClient.Voltra.Text>{`${data.days} days`}</VoltraClient.Voltra.Text>
        ),
        systemMedium: (
          <VoltraClient.Voltra.Text>{`${data.days} day streak`}</VoltraClient.Voltra.Text>
        ),
      }),
    }),
  ],
});

const streakWidget = frame.widget("streak");

await streakWidget.publish({ days: 12 });
await streakWidget.publishTimeline([
  { at: Date.now() - 1_000, data: { days: 12 } },
  { at: Date.now() + 86_400_000, data: { days: 13 } },
]);
await streakWidget.reload();
```

Creating the adapter, even at module scope, calls nothing. Off Apple it answers `unavailable`, so Frame moves on to the next adapter in the list, which is how one Frame serves iOS with this adapter and Android with another.

## Options

| Option      | Type                                    | Meaning                                                                                                                                                                                  |
| ----------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`       | `VoltraIosClientLike`                   | The `@use-voltra/ios-client` module, passed as `import * as VoltraClient`. It names only `assertRunningOnApple`, `updateWidget`, `scheduleWidget` and `reloadWidgets`.                   |
| `render`    | `(data: TData) => VoltraWidgetVariants` | Builds the Voltra JSX for each widget family from the data. It is your code, and it runs before every SDK call: a throw is answered `failed` and nothing reaches Voltra.                 |
| `available` | `() => boolean`                         | Optional. Whether this runtime can use Voltra, asked each time Frame opens the adapter. By default it asks the SDK's `assertRunningOnApple`, which logs an error where it answers false. |

## Capabilities

| Capability | Provided                                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platforms  | iOS. Where Voltra reports it is not on Apple, `open` answers `unavailable` with a reason and a remedy, and no widget function is called.                                                                  |
| Operations | `publish` (a snapshot), `publishTimeline`, `reload`. There is no readback: Voltra returns nothing it stores, and `getActiveWidgets` lists placements, not content, so `readback()` answers `unavailable`. |
| Evidence   | `sdk-promise-resolved` for every submission, because every Voltra function is async. Never `sdk-call-returned`, never `simulated`.                                                                        |

By default the availability probe is `sdk.assertRunningOnApple()`, the function Voltra's own widget functions use, and it is the only SDK call `open` makes. It reads `Platform.OS` inside Voltra, so the adapter and the SDK agree on where a call would be a no-op. Voltra logs `Voltra is available only on iOS!` with `console.error` each time it answers false, which a development build shows as an error toast on every Android or web opening. When a Frame lists adapters for several platforms, pass `available`, such as `() => Platform.OS === "ios"`, and the SDK's probe is never called. Every opening asks again.

## How a call is mapped

| Frame request              | Voltra call                                                              | Answer                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| open                       | `assertRunningOnApple()`                                                 | `opened`, or `unavailable` with a reason and a remedy.                                                                  |
| `publish(data)`            | `updateWidget(name, render(data))`                                       | Resolved: `submitted` with `sdk-promise-resolved`. `render` threw: `failed`. Rejected: the rejection is thrown.         |
| `publishTimeline(entries)` | `scheduleWidget(name, [{ date: new Date(at), variants: render(data) }])` | Same. Every entry is rendered before the call, so one that throws fails the whole timeline and nothing is scheduled.    |
| `reload()`                 | `reloadWidgets([name])`                                                  | Resolved: `submitted` with `sdk-promise-resolved`, which acknowledges the request and never a render. Rejected: thrown. |
| write domain               | `voltra-ios:<name>`                                                      | One write domain per native widget id: its calls run one at a time.                                                     |

A rejection or a throw from Voltra is never `failed` and never swallowed: Frame reads it as `indeterminate`. The rejection can come from Voltra's JavaScript, where it renders your JSX to its payload inside the call before anything is stored, or from the native module, and the adapter cannot tell which. `failed` is reserved for a `render` that threw, which happens before any call.

## What Frame does not normalize

These are Voltra's own limits, and Frame does not hide them.

- **Drawing.** `submitted` means Voltra's promise resolved. It does not mean WidgetKit drew anything, or that a widget is placed. Frame never answers `skipped`, because the adapter does not call `getActiveWidgets`.
- **Family coverage.** Frame does not check which families `render` returns against the families your widget declares. If a placed family has no variant, Voltra 2.3.2 shows the first variant it finds in the order `systemMedium`, `systemSmall`, `systemLarge`, `systemExtraLarge`, `accessoryRectangular`, `accessoryCircular`, `accessoryInline`, and an empty variants object shows nothing.
- **Unknown widget ids.** Nothing in Voltra's calls checks that a widget with the definition's `name` is declared in the config plugin. Its native code stores the payload under the id and reloads the kind derived from it, so a name that is not declared resolves normally and displays nothing.
- **Native module missing.** On iOS without the Voltra native module, such as a build that lacks it, the SDK throws `NativeVoltra is not available`. The probe does not look for the module, so the call is answered `indeterminate` with that error.
- **Snapshot and schedule.** In 2.3.2 `updateWidget` also clears the widget's scheduled timeline, so a snapshot after a timeline replaces the schedule. Voltra builds its local timelines with the WidgetKit policy `never`, so WidgetKit asks for no further timeline after the last entry until a reload. WidgetKit's own refresh budget applies to every reload.
- **Size.** Voltra logs a native warning when a payload passes 50,000 bytes or a timeline 100,000 bytes. It still stores them.
- **Server updates.** A widget that declares `serverUpdate` in its plugin configuration builds its timeline from the server once the server has answered, and replaces the stored payload with the server's response. Voltra falls back to the local payload only while no server content was ever fetched. Frame still answers `submitted`, because the call returned.
- **Native module on the web.** Voltra has no stub: importing `@use-voltra/ios-client` on the web is expected to throw, so a Frame for the web lists no Voltra adapter, with a platform file extension.
- **Not mapped.** Per-update and per-entry deep links, Dynamic Widgets (which Voltra documents as experimental), server-driven updates, preloaded images, Live Activities and Android. The adapter passes none of Voltra's options.
- **Render errors inside Voltra.** `render` returns JSX, and Voltra turns it into its payload inside `updateWidget`. A JSX tree Voltra cannot render rejects there, and is answered `indeterminate`, because the adapter cannot tell that it failed before the native call.

## Tests

What ran: unit tests with an in-process fake of `@use-voltra/ios-client` 2.3.2 (its behavior off Apple, its persist then reload order, and its async functions are modelled on the 2.3.2 source), the shared conformance suite from `@priemskiyyy/frame/testing`, and type contracts compiled against the real installed `@use-voltra/ios-client` and `@use-voltra/ios` 2.3.2 types.

Native smoke check, 2026-10-30: the packed 0.1.0 candidate ran against the real 2.3.2 native module and App Group in an iOS 26.5 simulator development build. Snapshots, replacements, reload and a three-entry timeline returned `submitted`; duplicates answered `unchanged`, and invalid data answered `invalid`. The placed widget displayed the first and final timeline values while the application stayed in the background. Readback answered `unavailable`, as this adapter provides none. See the [native setup notes](https://github.com/priemskiyyy/frame/blob/main/docs/limitations.md#native-project-setup) for the combined test application.

What did not run: a physical device, every widget family, long-term WidgetKit refresh budgets, Live Activities or Dynamic Widgets. The native smoke check is separate from the automated test suite.

## License

MIT
