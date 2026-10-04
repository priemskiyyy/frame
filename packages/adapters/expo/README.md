# @priemskiyyy/frame-expo

iOS home screen widgets for Frame, over the `expo-widgets` you inject. You write the widget's layout once as a `render` function and Frame publishes typed, validated data to it: a snapshot, a whole schedule, a reload request and a readback of what the widget stores. Frame never initializes, configures or closes `expo-widgets`.

## Installation

```sh
pnpm add @priemskiyyy/frame @priemskiyyy/frame-expo expo-widgets
```

`@priemskiyyy/frame` is a peer at `>=0.1.0 <0.2`, and `expo-widgets` an optional peer at `>=57.0.22 <58`: the adapter never imports it, you pass it in. Its types mention React elements, so `@types/react` `>=19.2 <20` is an optional peer, as it is in every React Native app. Set `expo-widgets` up as its own documentation says: the config plugin, an App Group and a development build. Expo Go cannot host these widgets. The definition's `name` is the widget kind the native extension installs.

## Create an adapter

```tsx
import { Frame, widget } from "@priemskiyyy/frame";
import { expoWidget } from "@priemskiyyy/frame-expo";
import type { ExpoLayout } from "@priemskiyyy/frame-expo";
import { Text, VStack } from "@expo/ui/swift-ui";
import * as ExpoWidgets from "expo-widgets";
import { z } from "zod";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const StreakView: ExpoLayout<{ days: number }> = (props) => {
  "widget";

  return (
    <VStack>
      <Text>{`${props.days} days`}</Text>
    </VStack>
  );
};

export const frame = new Frame({
  widgets: { streak },
  adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
});

await frame.widget("streak").publish({ days: 12 });
```

The factory is cold: creating the adapter calls `expo-widgets` nothing, so it may run at module scope. Opening it registers `render` with the native extension, once per opening, so call `frame.prepare()` when the app starts: the extension keeps the layout it last registered until then, even after an app update. On a platform with no shared widgets directory, such as Android or the web, `open` answers `unavailable` and `createWidget` is never called, so Frame moves on to the next adapter in the list. `expo-widgets` ships a stub for Android and the web, so importing it there is safe. On an iOS binary without its native module, such as Expo Go, importing it throws before the adapter exists.

## Options

| Option   | Type                | Meaning                                                                                                                                                                                                                 |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`    | `ExpoWidgetsLike`   | The `expo-widgets` module, passed as `import * as ExpoWidgets`. It names only `widgetsDirectory` and `createWidget`.                                                                                                    |
| `render` | `ExpoLayout<TData>` | The widget's layout, marked with the `'widget'` directive. It is handed to the SDK as it is, and Expo's Babel preset (`babel-preset-expo`) turns it into source the widget runtime evaluates alone, in its own context. |

## Capabilities

| Capability   | Provided                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Platforms    | iOS with an App Group. Where the module reports no shared directory, which is also what a missing App Group entitlement looks like, `open` answers `unavailable` with a reason and a remedy, and no widget function is called. |
| Operations   | `publish` (a snapshot), `publishTimeline`, `reload` and `readback`.                                                                                                                                                            |
| Evidence     | `sdk-call-returned` for every submission: each call is synchronous and returns nothing. Never `sdk-promise-resolved`, never `simulated`, and never that WidgetKit redrew.                                                      |
| Write domain | `expo:<definition name>`: one native widget kind is one write domain, so writes to it run one at a time.                                                                                                                       |

## How a call is mapped

| Frame request              | `expo-widgets` call                                         | Answer                                                                                                          |
| -------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| open                       | reads `widgetsDirectory`, then `createWidget(name, render)` | `opened`, or `unavailable` when the directory is `null` or empty.                                               |
| `publish(data)`            | `widget.updateSnapshot(data)`                               | `submitted` with `sdk-call-returned`. A throw is left to throw: Frame answers `indeterminate`.                  |
| `publishTimeline(entries)` | `widget.updateTimeline([{ date, props }])`                  | The same. Each instant becomes a `Date`, each value its `props`.                                                |
| `reload()`                 | `widget.reload()`                                           | The same. It acknowledges the request, never a render.                                                          |
| `readback()`               | `widget.getTimeline()`                                      | `read` with the stored entries, instants mapped back to epoch milliseconds. Frame parses them with your schema. |

A throw from a write or a reload is never `failed` and never swallowed: effects may have happened, so Frame answers `indeterminate`. A readback whose `getTimeline()` throws answers `failed`, because it wrote nothing.

## What Frame does not normalize

- **Drawing.** `submitted` means the call returned. `expo-widgets` writes the widget's shared storage and asks WidgetKit to reload; none of its methods says when, or whether, the host redraws, and WidgetKit's own refresh budget applies to every reload.
- **A snapshot is a one-entry schedule.** The module stamps it with the time of the call, so a snapshot after a timeline replaces the schedule. The module asks WidgetKit for a new timeline after the last entry, so a snapshot, which is already in the past when WidgetKit reads it, can spend refresh budget.
- **Null.** The module stores widget data as a property list, which cannot hold `null`. The adapter refuses data that contains it as `failed`, naming the path, before any call. Use an optional field or another sentinel in the widget's schema.
- **Dates.** A timeline instant must fit a `Date`, which holds fewer values than a safe integer. Frame refuses an instant past it as `invalid`.
- **Time.** The module stamps a snapshot with the device's own clock, not Frame's `clock` option, so a readback after a snapshot shows device time.
- **Placement.** The module does not say whether a widget is placed, so this adapter never answers `skipped`.
- **The layout.** `render` runs inside the widget's own runtime, not in your app: it sees its `props` and the module's `environment`, and nothing else from your module. Frame does not check it. A layout that throws there is the module's to report, and Frame sees nothing of it.
- **Platforms.** Frame does not know whether the module's stub reaches a particular Android or web build. It only reads what the module reports.

## Tests

What ran: unit tests with an in-process fake modelled on `expo-widgets` 57.0.22 (a widget registers its layout when created, a snapshot is a one-entry timeline stamped with the time of the call, and every write asks for a reload), the shared conformance suite from `@priemskiyyy/frame/testing`, and type contracts compiled against the real installed `expo-widgets` and `@expo/ui` types.

What ran on a device: the example app in `examples/expo` on an iOS simulator (iPhone 17, a development build), run by hand against the final runtime. A published streak appeared on the home screen widget and a second publish replaced it, publishing the same content again was answered `unchanged`, a timeline of three entries was submitted and the widget moved through it on its own while the app was in the background, a readback returned the three stored entries with nothing rejected, and a context change reset the widget. A reload request returned `submitted` in an earlier run, before the last runtime changes, and was not repeated. That is a hand run, not a test suite.

What did not run: a physical device, WidgetKit's refresh budget over time, Android and the web with the stub, and a widget placed in more than one family at once.

## License

MIT
