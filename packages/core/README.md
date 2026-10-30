# @priemskiyyy/frame

The Frame runtime: typed, validated, ordered publication of widget data, with outcomes that say only what is known. It has no dependencies and calls no provider by itself; an adapter does that, through the SDK your application already configured.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/frame/blob/main/docs/limitations.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/frame
```

It needs TypeScript 5.4 or newer. Pair it with an adapter for each platform you draw widgets on, such as `@priemskiyyy/frame-expo`, and with any [Standard Schema](https://standardschema.dev) library for your widget's data. The examples use `zod`.

## Define a widget

A widget is what you can show, described once and shared by every platform.

```ts
import { widget } from "@priemskiyyy/frame";
import { z } from "zod";

export const streak = widget({
  name: "StreakWidget",
  schema: z.object({
    habit: z.string().min(1).max(24),
    days: z.number().int().nonnegative(),
  }),
  fallback: { habit: "Run", days: 0 },
});
```

- `name` is the widget kind a provider installs, letters and digits starting with a letter. Renaming it renames an installed widget.
- `schema` describes the final value, and what it accepts must equal what it was given. A schema whose input and output types differ, as a default or a coercion makes them, is a compile error, and one that keeps the type but changes a value is refused at runtime as `invalid`, because Frame publishes your value and never a transformation of it.
- `fallback` is what `reset()` shows. It is checked against the schema's output type.

## Create a Frame

```ts
import { Frame } from "@priemskiyyy/frame";
import { expoWidget } from "@priemskiyyy/frame-expo";
import * as ExpoWidgets from "expo-widgets";

export const frame = new Frame({
  widgets: { streak },
  adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
});
```

| Option     | What it is                                                                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `widgets`  | What can be shown, by the name your app uses. The same on every platform.                                                                                                                                                                          |
| `adapters` | What draws the widgets here, in order of preference. A widget is hosted by the first of its adapters that can work in this runtime. Leave it out where nothing can host them. An adapter for a widget `widgets` does not list is a type error.     |
| `timeout`  | How long one provider call may take, in milliseconds, before its request ends `indeterminate` and its write domain stops taking work. It also bounds opening an adapter and an asynchronous schema's answer. Defaults to 5000, at most 2147483647. |
| `limits`   | `depth` (64), `nodes` (50000), `bytes` (262144) and `entries` (64) of one publication.                                                                                                                                                             |
| `clock`    | The clock, for tests. Every time and timer Frame reads goes through it.                                                                                                                                                                            |

Constructing a Frame calls no provider. An adapter opens when you call `frame.prepare()` or at the first publish. Misconfiguration throws `INVALID_CONFIGURATION`: a duplicate widget name, an invalid option, a fallback the schema rejects, or an adapter for a widget the Frame does not list where the types were widened. It is the only thing Frame throws.

## Publish

```ts
const streakWidget = frame.widget("streak");

const outcome = await streakWidget.publish({ habit: "Run", days: 12 });

if (outcome.status === "submitted") {
  console.log(outcome.evidence);
}
```

`publish` never rejects. It resolves with one of eleven outcomes, described in [outcomes](https://github.com/priemskiyyy/frame/blob/main/docs/outcomes.md), and each says what Frame knows and no more:

| Status          | Meaning                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `submitted`     | The adapter reached the boundary its `evidence` names. It never means the widget redrew.                  |
| `unchanged`     | The same content was already submitted, so nothing was sent. `force: true` sends it.                      |
| `superseded`    | A newer request replaced this one before it reached the provider.                                         |
| `invalid`       | Refused before any provider call: not plain data, over a limit, or not what the schema accepts unchanged. |
| `skipped`       | The provider reported no placed widget, so nothing was drawn.                                             |
| `unavailable`   | No adapter can host the widget here. Nothing was tried.                                                   |
| `failed`        | Preparing the value failed before the provider call, so the provider never heard of it.                   |
| `indeterminate` | A provider call threw, rejected or outlived its deadline. The widget may have changed.                    |
| `blocked`       | An earlier call has not answered, so its write domain takes no new work.                                  |
| `expired`       | The context ended before the request reached the provider.                                                |
| `disposed`      | The Frame was disposed first.                                                                             |

## Read and observe

A handle is passive: reading it starts nothing and calls no provider.

```ts
streakWidget.get(); // the value Frame wants shown, or null
streakWidget.status.get(); // { lifecycle, desired, work, latest }

const stop = streakWidget.subscribe(() => render(streakWidget.get()));
```

`get()` is the value Frame wants shown, which is not the value the provider received and not what the host displays. Those are three facts, and Frame never reports one as another. A handle belongs to the context it was taken in. After `frame.context()` the old handle reads `null` and its requests end `expired`, so take `frame.widget("streak")` again, or let the React hooks do it. In React, use the hooks of [`@priemskiyyy/frame-react`](https://github.com/priemskiyyy/frame/tree/main/packages/react).

## Operations

Every handle has the same operations on every platform. One the hosting adapter does not provide answers `unavailable`.

```ts
await streakWidget.reset();

await streakWidget.publishTimeline([
  { at: Date.now(), data: { habit: "Run", days: 12 } },
  { at: Date.now() + 60_000, data: { habit: "Run", days: 13 } },
]);

await streakWidget.reload();

const stored = await streakWidget.readback();
```

`publishTimeline` replaces the whole schedule at once, with strictly increasing instants and a first entry that is not in the future. `reload` acknowledges a request to the host, never a render. `readback` returns what the provider stores, parsed with your schema, and counts what it rejected, such as data an older build wrote.

## Contexts

When the account changes, change the context. Every handle of the old context ends at once, and a request of it that has not reached the provider expires.

```ts
await frame.context({ reset: "fallback" });

const next = frame.widget("streak");
```

`reset` defaults to `"fallback"`: every widget is replaced with its fallback before this resolves, behind any call still in flight, so one account's data never lingers for the next. `reset: "preserve"` keeps what the widget shows.

## Diagnostics

```ts
const { widgets, epoch } = frame.diagnostics.get();

const stop = frame.diagnostics.events.subscribe((event) => {
  console.debug(event.type);
});
```

Diagnostics name widgets and requests and never carry a value you published. `widgets` is keyed by the names you registered, and each entry names the hosting adapter. Events are built only while someone listens, and every published object, outcomes included, is frozen, except an `Error` a provider threw, which is handed back as thrown.

## Entry points

| Entry                        | What it is                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@priemskiyyy/frame`         | `Frame`, `widget`, `FrameError` and the types an application uses                                                 |
| `@priemskiyyy/frame/adapter` | Types only: the contract an adapter implements. An adapter takes its types here and never the runtime             |
| `@priemskiyyy/frame/mock`    | `createMockAdapter`, `createTestClock` and `settle`, for application tests. The mock answers `simulated` evidence |
| `@priemskiyyy/frame/testing` | `testWidgetAdapter`, the conformance suite every adapter must pass                                                |

## What Frame does not do

It does not render a widget, schedule one, or know what the host displays. There is no `visible` and no `renderedAt`. It does not initialize, configure or close your SDK, and it is not a store: a publication is a complete replacement, never a merge.

## License

[MIT](LICENSE)
