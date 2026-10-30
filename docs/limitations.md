---
description: What Frame does not do, and exactly what has and has not run on a device.
---

# Limitations

## What Frame does not do

- **It does not render widgets.** Your provider draws them, from a layout you write. Frame hands the layout a value.
- **It does not know what the host displays.** No provider reports it, so there is no `visible` and no `renderedAt`. A `submitted` outcome names the boundary a call reached and no further.
- **It does not schedule.** `publishTimeline` hands the provider a schedule it keeps. Frame runs no timer of its own for a widget.
- **It does not configure your SDK.** The application initializes, configures and closes it. Frame takes the SDK as an option and calls only what the adapter names.
- **It is not a store.** A publication is a complete replacement, never a merge. Frame persists nothing: after your app restarts, `get()` is `null` until you publish.
- **It does not handle taps.** A press or a deep link is part of the layout, written with the provider's own primitive, and a [recipe](recipes.md#open-a-screen-when-the-widget-is-tapped) shows how to carry the destination in the widget's data.
- **It does not target placements.** Every placed widget of a kind receives the same data.
- **It does not retry.** An `indeterminate` outcome is yours to read. The next publish goes out, but nothing publishes on its own.
- **It does not fake an operation.** A provider without a timeline, reload or readback answers `unavailable`, and Frame never replaces it with a timer or a second call.

## What a provider decides

Each adapter's README lists what Frame does not normalize. The ones that matter most:

- **Refresh budgets.** WidgetKit and Android launchers limit how often a widget redraws. A reload buys no extra display opportunity, and `force: true` does not either.
- **Placement.** Expo does not say whether a widget is placed, and the Voltra adapter does not ask, so neither answers `skipped`. The Android adapter answers it when the SDK lists none.
- **Layout errors.** Expo evaluates a layout inside the widget's own runtime, and Voltra turns JSX into its payload inside its own call. A layout the provider rejects there is the provider's to report, and Frame sees an `indeterminate` call at most.

## What has run

| Evidence                                                  | Expo adapter  | Voltra iOS adapter | Android adapter          |
| --------------------------------------------------------- | ------------- | ------------------ | ------------------------ |
| Unit tests against a fake modelled on a named SDK version | Yes           | Yes                | Yes                      |
| Conformance suite                                         | Yes           | Yes                | Yes                      |
| Type contracts against the real SDK's types               | Yes           | Yes                | Yes                      |
| A native development build                                | iOS simulator | iOS simulator      | Android emulator, API 36 |
| A rendered home screen widget                             | Yes           | Yes                | Yes                      |
| A physical device                                         | No            | No                 | No                       |

On 2026-10-30, the packed 0.1.0 candidates ran in an isolated native application with Expo 57.0.26 and React Native 0.86.3. The iOS runs used an iPhone 17 Pro simulator on iOS 26.5; Android used a Pixel 10 emulator on API 36.

- **Expo, expo-widgets 57.0.22:** snapshots and replacements returned `submitted`, an equal value returned `unchanged`, invalid data was refused, reload returned `submitted`, and readback returned the replacement value. A three-entry timeline was submitted, and its final value appeared on the home screen while the application was in the background. An earlier run through `examples/expo` also exercised a context reset.
- **Voltra, @use-voltra/ios-client 2.3.2:** snapshots, replacements, reload and a three-entry timeline returned `submitted`; duplicates answered `unchanged`, and invalid data answered `invalid`. The installed home screen widget displayed the first and final scheduled values while the application stayed in the background. Readback correctly answered `unavailable`.
- **Android, react-native-android-widget 0.22.1:** an unplaced widget answered `skipped`. After placement, snapshots and replacements returned `submitted`, and the launcher visibly displayed the replacement value. A duplicate answered `unchanged`, invalid data was refused, and unsupported reload and readback answered `unavailable`.

These are manual native smoke checks, separate from the automated test suite. They do not establish physical-device behavior, long-term refresh budgets, every widget family or every launcher. A provider call returning still does not prove that a later host redraw happened.

## Native project setup

The smoke application combined the three SDKs. Two upstream project-generation details needed app-level corrections:

- The Expo Widgets and Voltra config plugins reused an `Info.plist` file reference across their two Xcode target groups. The generated project needed a separate reference for each target.
- Android resolved WorkManager runtime 2.8.1 alongside its Kotlin extension 2.7.1, causing duplicate classes. Adding `androidx.work:work-runtime-ktx:2.8.1` to the application aligned the versions and allowed the build to complete.

The iOS application and widget extensions also need their configured App Group entitlements. The initially unsigned simulator build could not access that shared storage; ad-hoc signing activated its configured entitlements. Frame configures none of these native settings.

## Not built

Frame's first release is deliberately small. These are documented, not built: Voltra Dynamic Widgets and Live Activities, Android widgets over Voltra, widget configuration, click handling and interactions, placement targeting, a devtools inspector, and code generation.
