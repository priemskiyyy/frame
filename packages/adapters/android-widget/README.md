# @priemskiyyy/frame-android-widget

Android home screen widgets for Frame, over the `react-native-android-widget` you inject. A publication is a snapshot: the adapter lists the placed widgets of one kind, renders each with your function, and asks the SDK to update each one. It has no timeline, reload or readback, because the SDK has none, so those three answer `unavailable` on a widget this adapter hosts. Frame never initializes, configures or closes the SDK.

## Installation

```sh
pnpm add @priemskiyyy/frame @priemskiyyy/frame-android-widget react-native-android-widget
```

`@priemskiyyy/frame` is a peer at `>=0.1.0 <0.2`, and `react-native-android-widget` an optional peer at `>=0.22.1 <0.23`: the adapter never imports it, you pass it in. Its types mention React elements, so `@types/react` `>=19.2 <20` is an optional peer, as it is in every React Native app. Set the SDK up as its own documentation says (the config plugin, the widget provider, a development build); Frame does none of it. The definition's `name` must be the `name` you gave the widget in the SDK's config plugin, because that is what the SDK looks widgets up by.

## Create an adapter

The SDK has no platform probe, because telling Android from iOS needs `react-native`, which an adapter never imports. Where the SDK is loaded off Android its native module is a no-op that lists no widgets (0.22.1), so publishing there would answer `skipped`, not `unavailable`. Say where the adapter works with `available`, which the application answers each time Frame opens the adapter, and list the adapters in the order you prefer: the first one that can work here hosts the widget.

```tsx
// streak.tsx
import { widget } from "@priemskiyyy/frame";
import type { AndroidLayout } from "@priemskiyyy/frame-android-widget";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { z } from "zod";

export const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

export const renderStreak: AndroidLayout<{ days: number }> = (data) => (
  <FlexWidget style={{ flexDirection: "column" }}>
    <TextWidget text={`${data.days} days`} />
  </FlexWidget>
);
```

```ts
// client.ts
import { Frame } from "@priemskiyyy/frame";
import { androidWidget } from "@priemskiyyy/frame-android-widget";
import { Platform } from "react-native";
import * as AndroidWidgets from "react-native-android-widget";

import { renderStreak, streak } from "./streak";

export const frame = new Frame({
  widgets: { streak },
  adapters: [
    androidWidget(streak, {
      sdk: AndroidWidgets,
      render: renderStreak,
      available: () => Platform.OS === "android",
    }),
  ],
});
```

On iOS and the web, `available` answers false, `open` answers `unavailable` with a reason and a remedy, the SDK is never called, and every request answers `unavailable`. To keep Android code out of other bundles, use a Metro platform extension instead: `client.android.ts` lists this adapter, and the default `client.ts` is `new Frame({ widgets: { streak } })`, which has no adapter and answers `unavailable` everywhere.

The file names are illustrative. The factory is cold: creating or opening the adapter calls the SDK nothing, so it may run at module scope.

### Draw a widget the app did not publish to

A widget the user places after your last publication draws only when the app publishes again, or when your `registerWidgetTaskHandler` renders it. Frame does not register that handler for you. Register it in the app's entry file, after importing the module that creates the Frame, and have it render the value Frame wants shown:

```tsx
// index.ts, the Android entry file
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { frame } from "./client";
import { renderStreak, streak } from "./streak";

registerWidgetTaskHandler(async (props) => {
  const data = frame.widget("streak").get() ?? streak.fallback;

  props.renderWidget(renderStreak(data, props.widgetInfo));
});
```

Frame persists nothing. When Android starts the app's JavaScript in the background for a task, `get()` holds a value only if that process published one, and is `null` otherwise, so the fallback is drawn. Restore and publish the last value at start if the widget should show it.

## Options

| Option      | Type                                        | Meaning                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`       | `AndroidWidgetsLike`                        | The `react-native-android-widget` module the app imported: `import * as AndroidWidgets from "react-native-android-widget"`. Only `getWidgetInfo` and `requestWidgetUpdateById` are called.                                                                     |
| `render`    | `(data, placement) => WidgetRepresentation` | Draws the data for one placed widget: a tree of the SDK's primitives, or `{ light, dark }`. It runs once per placed widget, synchronously, before any update call, and receives the SDK's `WidgetInfo`.                                                        |
| `available` | `() => boolean`                             | Required. Whether this runtime can use the SDK, asked each time Frame opens the adapter. The SDK has no probe of its own, and off Android it lists no widgets, which would read as `skipped` forever, so answer it, such as `() => Platform.OS === "android"`. |

## Capabilities

| Capability   | Provided                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Platforms    | Android only, by your `available`: the SDK has no platform probe, so the application answers it.                          |
| Operations   | A snapshot `publish`. No `timeline`, `reload` or `readback`: the SDK has none, so those answer `unavailable`.             |
| Evidence     | `sdk-call-returned`, the strongest it can claim. Never `sdk-promise-resolved`, and never that the launcher redrew.        |
| Answers      | `submitted`, `skipped` when no widget is placed, `failed` when your render threw, `indeterminate` when an SDK call threw. |
| Write domain | `android-widget:<definition name>`: one native widget kind is one write domain, so writes to it run one at a time.        |

## How a call is mapped

| Step | The adapter calls                                                                                          | If it goes wrong                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | `getWidgetInfo(name)`, to list the placed widgets of the kind                                              | It rejects: the call throws, and Frame answers `indeterminate`. Nothing was rendered or updated.                             |
| 2    | Nothing, when none is placed                                                                               | The answer is `skipped` with `no-placements`. Nothing is rendered, and no update is called.                                  |
| 3    | `render(data, placement)` for every placed widget, before any update call                                  | A throw is `failed` with the error. Nothing reached an update call, so nothing is drawn.                                     |
| 4    | `requestWidgetUpdateById({ widgetName, widgetId, renderWidget })` for each, with the tree already rendered | One rejects: the call throws once every update has settled, and Frame answers `indeterminate`. Some placements may be drawn. |
| 5    | Nothing more                                                                                               | Every update returned: `submitted` with `sdk-call-returned`.                                                                 |

The adapter waits for every update to settle before it throws, so a failed placement never frees the write domain while another draw is still in flight. A `skipped` answer is not remembered as submitted: publishing the same value again after a widget is placed sends it.

## What Frame does not normalize

**A known upstream issue, react-native-android-widget 0.22.1.** `requestWidgetUpdate` renders each placed widget inside `widgetsInfo.forEach(async ...)` without awaiting it, so the promise it returns does not stand for completion, and a render error is lost. Neither `requestWidgetUpdate` nor `requestWidgetUpdateById` awaits the native `drawWidgetById`, which the SDK calls and does not wait for. This adapter therefore never calls `requestWidgetUpdate`: it lists with `getWidgetInfo` and calls `requestWidgetUpdateById` for each placed widget, which does await the render callback, so a render error rejects. The draw itself is still not awaited by the library, so the strongest evidence Frame can claim is `sdk-call-returned`, and nothing says the launcher redrew.

What follows from it:

- A tree the SDK cannot build, such as a `ListWidget` inside a `ListWidget` or more than two of them, is rejected inside `requestWidgetUpdateById`, after your render returned. It is answered `indeterminate`, not `failed`, because other placements may already be drawn. Building the tree is a private function of the SDK, so Frame cannot check it first.
- A widget removed between the listing and its update is not drawn, and the SDK still returns without an error.
- A throw from your `render` is the only case Frame knows reached nothing, and the only one answered `failed`.
- The native draw catches every exception and prints it to the log, so a native draw failure never reaches JavaScript. `sdk-call-returned` is the most Frame can claim.
- A misspelled `definition.name` lists no widget, so every publication answers `skipped`. The name must be the `name` in the SDK's config plugin.
- Equal content is answered `unchanged`. A widget placed later still shows nothing until your task handler draws it or the app publishes with `force: true`.
- The `dark` tree is required when you answer `{ light, dark }`: the SDK's type allows `null`, but its implementation throws on it, so the type here does not. For light only, answer the tree itself.

The rest:

- Every placed widget of the kind receives the same data. There is no placement targeting, no widget configuration and no click handling; `placement` lets your render lay out for a widget's size, not publish different data to it.
- A widget placed later is drawn by your task handler, not by Frame (see above).
- `skipped` means the SDK listed no placed widget. Frame does not know whether the user has placed one, and does not observe the launcher.
- Frame has no `visible` and no `renderedAt`: the value Frame wants shown, the value the SDK received and what the launcher displays are three facts.

## Tests

What ran: unit tests with an in-process fake modelled on react-native-android-widget 0.22.1 (`getWidgetInfo`, and `requestWidgetUpdateById`, which lists again, finds its id, awaits the render callback and draws); the conformance suite from `@priemskiyyy/frame/testing`, with its unavailability check answered through `available`; and type contracts compiled against the real installed 0.22.1 types, which prove the real module fits `AndroidWidgetsLike` and that a wrong object, or one with only `requestWidgetUpdate`, is refused.

What did not run: an Android build, an emulator and a device. No test touched the SDK's native module, a launcher or the SDK's tree building, so the fake's draws are records, not pixels, and what the launcher shows is unverified.

## License

MIT
