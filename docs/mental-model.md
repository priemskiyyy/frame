---
description: The few ideas behind Frame: widgets, adapters, handles, the three facts, write domains and contexts.
---

# Mental model

Frame is a small number of ideas. Once they are clear, the API follows from them.

## Widgets

A widget is a `widget()` definition: a `name`, a schema and a fallback. It says what can be shown and nothing about who draws it, so one definition serves every platform.

```ts
import { widget } from "@priemskiyyy/frame";

export const streak = widget({
  name: "StreakWidget",
  schema: StreakSchema,
  fallback: { days: 0 },
});
```

A Frame lists its widgets by the name your app uses, and `frame.widget("streak")` hands back that widget's handle.

## Adapters

An adapter draws one widget through one provider. A Frame takes an ordered list of them, and each widget is hosted by the first adapter that can work in the current runtime:

```ts
const frame = new Frame({
  widgets: { streak },
  adapters: [
    expoWidget(streak, { sdk: ExpoWidgets, render: StreakView }),
    androidWidget(streak, {
      sdk: AndroidWidgets,
      render: StreakCard,
      available: isAndroid,
    }),
  ],
});
```

On iOS the Expo adapter opens. On Android it answers `unavailable`, so the Android adapter is tried. Where neither can work, such as the web, every request answers `unavailable` with the reasons. An adapter never calls a provider that is not there, and a silent success is a defect.

An adapter is cold. Creating one calls nothing, and it takes the SDK your application already configured as an option, never importing or configuring it.

An adapter for a widget the Frame does not list is a type error, because `adapters` is typed by `widgets`: each adapter must be for one of the listed definitions, with its name and its data. Where the types were widened, such as a list built at runtime, the same mistake throws `INVALID_CONFIGURATION` when the Frame is made.

## Preparing and disposing

Nothing opens until a request needs it or you call `frame.prepare()`, which opens every widget's adapters and reports which are `ready`, `unavailable`, `failed` or, on a disposed Frame, `disposed`. The `timeout` bounds opening as well as calls: an adapter that does not answer `open` in time fails its request, and an answer that comes late is released, never used. It bounds an asynchronous schema's answer too, so a schema that never answers cannot hold a request for ever. A Frame with no adapters has nothing to open, so its widgets are `unavailable` from the start.

`frame.dispose()` stops the Frame at once. Waiting requests end `disposed`, a call in flight ends `indeterminate`, and every opened adapter is released. It never removes an installed widget or closes an SDK, which stays yours.

## Handles

`frame.widget("streak")` returns a handle, and it is the same on every platform. It is typed by the definition's data and never by the adapter, so the code that publishes does not know which provider is behind it.

| Member                               | What it does                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `publish(data, options?)`            | Replaces the widget's content. Resolves an outcome, never rejects. |
| `reset(options?)`                    | Replaces the widget's content with its fallback.                   |
| `publishTimeline(entries, options?)` | Replaces the whole schedule at once.                               |
| `reload()`                           | Asks the host to redraw.                                           |
| `readback()`                         | Reads what the provider stores, parsed with your schema.           |
| `get()`, `subscribe`, `status`       | Passive reads: they start nothing and call no provider.            |

An operation the hosting adapter does not provide answers `unavailable`. Frame never emulates one with a timer or a second provider call.

## Three facts

Frame keeps three facts apart and never reports one as another:

1. **The value Frame wants shown.** What `get()` returns. It is known the moment a publication is accepted.
2. **The value the provider received.** What an adapter's call carried, known when the call returns.
3. **The value the host displays.** Not known to anyone. No provider reports it, so Frame has no `visible` and no `renderedAt`.

This is why a `submitted` outcome names its evidence, and why a call that threw is `indeterminate` rather than `failed`: its effects may have happened.

## A publication is a complete replacement

A publication replaces the widget's content. It is never a merge. Your schema describes the value that goes on the wire, and it must accept exactly what it is given: a schema that strips a key, applies a default or coerces a type changes the value, and Frame refuses it as `invalid` instead of publishing something you did not write. Types catch most of that at compile time.

Data is captured as plain JSON with its keys sorted, under limits on depth, node count and size, and handed to the schema and the adapter as a frozen copy. Mutating your object after the call changes nothing. What Frame hands back is frozen too: outcomes, status, diagnostics and the value `get()` returns, except an `Error` a provider threw, which is handed back as thrown.

## Order, coalescing and duplicates

Requests are ordered by when you made them, not by when their validation finished. One native widget takes one write at a time, so a request still waiting when a newer one arrives is replaced, never sent: it ends `superseded`. Equal content is compared by its canonical form, so key order does not matter, and content equal to what was last submitted for sure ends `unchanged`. After a skipped or uncertain submission nothing is known to be submitted, so the next publish goes out. A failed one reached no provider, so the widget still shows what it did, and equal content is compared with that. A new context starts knowing nothing: with `reset: "preserve"` its first publish goes out, and with the default `reset: "fallback"` the first request is the fallback itself, so a publish equal to the fallback ends `unchanged`. `force: true` sends equal content anyway.

## Write domains

An adapter names the physical resource whose writes can overwrite one another, such as `expo:StreakWidget`. Frame runs the calls of one write domain one at a time. A call that outlives the `timeout` ends `indeterminate` and keeps its write domain, because its write may still land. Requests behind it end `blocked` without being tried, and the domain frees itself when the stuck call finally answers.

## Contexts

A context is the boundary between one account's data and the next. `frame.context({ reset })` starts a new one:

```ts
await frame.context();
```

`reset` defaults to `"fallback"`, and `{ reset: "preserve" }` keeps what the widgets show. Every handle of the old context ends at once, before anything is awaited. A request of it that has not reached the provider ends `expired`, and an old handle never publishes into the new context. With `reset: "fallback"` every widget is replaced with its fallback, behind any call still in flight, so one account's data never lingers for the next.

## What may throw

Only misconfiguration: a definition, an option, an adapter for a widget the Frame does not list, or a hook outside its provider throws `FrameError` with `INVALID_CONFIGURATION`. Everything else is an outcome.
