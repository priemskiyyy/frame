# Frame

**Typed, provider-independent widget publication for React Native.**

Frame answers one question: what did your app put on a home screen widget, and what does it honestly know about it? You describe a widget once, say which provider draws it on each platform, and publish typed data. Every publish ends in an outcome that names the boundary it reached and never claims more.

```ts
import { Frame, widget } from "@priemskiyyy/frame";
import { expoWidget } from "@priemskiyyy/frame-expo";
import * as ExpoWidgets from "expo-widgets";
import { z } from "zod";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

export const frame = new Frame({
  widgets: { streak },
  adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
});

const outcome = await frame.widget("streak").publish({ days: 12 });
```

```tsx
const data = useWidgetData("streak");
```

## Why not call the widget SDK directly

One call to `updateSnapshot` is one line. Frame owns what surrounds it:

- **Bad data never reaches the provider.** Your schema checks every value, and a value the schema would change is refused, not fixed. The provider receives exactly what you published.
- **Honest outcomes.** A resolved publish means the provider call returned, never that the widget redrew. A call that threw is `indeterminate`, because effects may have happened. Eleven outcomes, none of them a guess.
- **Order and coalescing.** Requests are ordered by when you made them, one native widget takes one write at a time, and a request still waiting when a newer one arrives is replaced, never sent. Equal content is not sent twice, except when you force it.
- **One account never inherits another's widget.** A context change ends every handle of the old account at once, resets the widget to its fallback, and a request the old account had not sent yet expires.
- **A stuck provider call cannot be overtaken.** A call that outlives its deadline keeps its write domain, so a later write never races an earlier one that may still land.
- **The same code on every platform.** A handle has the same type whichever adapter hosts the widget, and an operation an adapter lacks answers `unavailable`.
- **Your SDK, untouched.** Adapters take the SDK your application configured and never configure, initialize or close it.

Frame does not render widgets, schedule them, or report what the host displays. Your provider keeps doing those.

## Packages

| Package                                                                 | What it is                                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@priemskiyyy/frame`](packages/core)                                   | The runtime, the adapter contract, the mock adapter and the test kit          |
| [`@priemskiyyy/frame-react`](packages/react)                            | A provider and hooks for React and React Native                               |
| [`@priemskiyyy/frame-expo`](packages/adapters/expo)                     | iOS home screen widgets over `expo-widgets`                                   |
| [`@priemskiyyy/frame-voltra-ios`](packages/adapters/voltra-ios)         | iOS home screen widgets over Voltra's payload mode (`@use-voltra/ios-client`) |
| [`@priemskiyyy/frame-android-widget`](packages/adapters/android-widget) | Android home screen widgets over `react-native-android-widget`                |

Every package is ESM only, side-effect free and typed. The core has no dependencies, and an adapter has no runtime dependency on the core.

## Documentation

The guides live in [`docs/`](docs):

- [Getting started](docs/getting-started.md): install, define a widget, publish, read the outcome
- [Mental model](docs/mental-model.md): widgets, adapters, handles and contexts
- [Outcomes](docs/outcomes.md): the eleven ways a publication ends, and what each one proves
- [React](docs/react.md): the provider, `Register` and the hooks
- [Recipes](docs/recipes.md): prepare at launch, mirror state to a widget, say when it is unsupported, switch accounts
- [Timelines, reload and readback](docs/timelines.md): schedules, redraws and what a provider stores
- [Adapters](docs/adapters.md): which providers fit, and how a widget picks one
- [Testing](docs/testing.md): the mock adapter, the test clock and the conformance suite
- [Writing an adapter](docs/writing-an-adapter.md): the contract, the rules and the checklist
- [Limitations](docs/limitations.md): what Frame does not do, and what has and has not run on a device

## Example

[`examples/expo`](examples/expo) is Frame Studio, an Expo app that publishes a habit streak to a real home screen widget and lets you break it on purpose: bad JSON, a burst of updates, the same data twice, a provider that fails or goes quiet, an account switch, a schedule and a readback. It runs the same screens over the real adapter, over Frame's mock and over a Frame with no adapter. See its [README](examples/expo/README.md).

## Status

Version 0.1.0 is an initial preview. The API may change before 1.0. The adapters are tested against fakes modelled on named SDK versions and type-checked against the real SDKs. All three adapters have run in native simulator or emulator development builds, including rendered home screen widgets. Physical devices and long-term refresh budgets remain unverified. Each adapter's README and the [verification limits](docs/limitations.md) say exactly what ran.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm check:release
```

`pnpm check` builds every package, then runs TypeScript, ESLint, the lint-rule probes, Prettier and the unit tests with coverage. `pnpm check:release` adds the mutation probes, the packed consumer, the documentation and the release metadata. See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md) and [RELEASING.md](RELEASING.md).

## License

[MIT](LICENSE)
