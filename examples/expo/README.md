# Frame Studio

An Expo app that publishes a habit streak to a real iOS home screen widget through Frame, and lets you break it on purpose. It runs the same screens over the real adapter, over Frame's mock and over a Frame with no adapter, so every outcome Frame can answer except `disposed` is one tap away.

## Run it

```sh
pnpm install
pnpm build
pnpm --filter example-expo ios
```

A development build is required: Expo Go cannot host widgets. `pnpm --filter example-expo ios` runs `expo run:ios`, which generates the native project, installs the app and starts Metro. Add the **Habit streak** widget from the home screen gallery, then publish from the app.

`pnpm --filter example-expo web` serves the same screens with no widget host, and `pnpm --filter example-expo build` exports them. There the **Home screen** provider is a Frame with no adapter, so publishing answers `unavailable`, which is the point: it keeps its shape and never pretends to succeed. Switch the provider to **Simulated** to drive Frame's mock, or to **Unhosted** to see the same refusal on iOS. Neither the web export nor the screens in a browser are part of `pnpm check`.

## What each card shows

| Card                   | What it proves                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | One Frame per provider, switched at runtime through `FrameProvider`: the real widget, Frame's mock, and a Frame with no adapter. The adapter opens on demand or on its first publish.                     |
| Widget                 | Publish and reset, the preview of what Frame wants shown, and the facts Frame knows: the hosting adapter, what it waits on, the revision.                                                                 |
| Trust boundary         | Raw JSON against the schema: negative numbers, wrong types, extra and missing fields, and not a record are refused before any call, and an issue names the field.                                         |
| Ordering               | Five updates in a row: only the newest reaches the provider, and the rest end `superseded`.                                                                                                               |
| Duplicates             | Equal content is `unchanged`, and `force` sends it again.                                                                                                                                                 |
| Provider failures      | On the simulated provider: a call that fails, one that crashes, one that finds no widget, and one that goes quiet and blocks its write domain until it is released.                                       |
| Schedule               | A timeline of three days, one a minute. Close the app and the widget moves on its own.                                                                                                                    |
| What the widget stores | A readback of the stored entries, parsed with the schema, and a reload request, each with the reason it answered as it did. On the simulated provider, seed an older build's data.                        |
| Accounts               | A context change resets the widget of every provider's Frame, and publishing with the previous account's handle ends `expired`.                                                                           |
| Ledger and Diagnostics | Every request and how it ended, and every step Frame took, newest first. The latest outcome stays pinned under the page, and a new one is announced to a screen reader, with a haptic for the loud tones. |

## How it is built

- `src/widgets/streak/` is the widget: its schema and definition (shared by every platform) and the layout the home screen draws.
- `src/frames/` has one Frame per provider. `deviceFrame.ios.ts` lists the Expo adapter, and `deviceFrame.ts` is a Frame with no adapter for every other platform. `unhostedFrame.ts` is that Frame on every platform, and `simulatedProvider.ts` is Frame's mock. All have the same type. `frames.ts` and `eventLogs.ts` index them by provider, and `Register.ts` tells the hooks which Frame type they read.
- `src/components/Studio/` is the screen. Each card reads its own widget with `useWidget("streak")`, `useWidgetData("streak")`, `useWidgetStatus("streak")` and `useFrameDiagnostics()`, and none is handed a handle. The accounts card holds the previous handle itself, to show it expire, and is keyed by provider so it never outlives its Frame.
- `src/state/` is a reducer with exhaustive `ts-pattern` dispatch, and `src/domain/` is the app's own logic: the streak the app keeps, and the projection of it that the widget shows.

## Tests

`pnpm test:unit` runs the example's own tests with the rest of the repository:

- the reducer;
- the contract between this app's native configuration and its widget definition: the widget's name, the families it supports against the families the preview draws, and the extension and App Group names;
- the projection of the streak, and the parser of the text a person types;
- the sentences the page says about each outcome, evidence and diagnostics event, and that the legend lists every status;
- the event log, and the time format;
- the trust boundary presets and the provider faults, each driven through Frame's mock so what the cards promise is what Frame answers.

The screens themselves have no automated tests: run them on a simulator or a device.
