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

| Evidence                                                  | Expo adapter                       | Voltra iOS adapter | Android adapter |
| --------------------------------------------------------- | ---------------------------------- | ------------------ | --------------- |
| Unit tests against a fake modelled on a named SDK version | Yes                                | Yes                | Yes             |
| Conformance suite                                         | Yes                                | Yes                | Yes             |
| Type contracts against the real SDK's types               | Yes                                | Yes                | Yes             |
| A native build on a simulator or emulator                 | iOS simulator, a development build | No                 | No              |
| A physical device                                         | No                                 | No                 | No              |

On the iOS simulator, the Expo adapter published a value to a real home screen widget, replaced it, moved it through a three entry schedule on its own while the app was in the background, and read back what the widget stores. A reload was acknowledged in an earlier run, before the last runtime changes, and was not repeated. These were runs by hand through the example app. They are not a test suite, and they are not evidence about WidgetKit's refresh budget over time.

Nothing in this repository has run on a physical device, against the Voltra native module, or on Android.

## Not built

Frame's first release is deliberately small. These are documented, not built: Voltra Dynamic Widgets and Live Activities, Android widgets over Voltra, widget configuration, click handling and interactions, placement targeting, a devtools inspector, and code generation.
