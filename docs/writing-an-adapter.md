---
description: The contract an adapter implements, the rules every adapter follows, and the layout and tests that prove one.
---

# Writing an adapter

An adapter draws one widget definition through one provider. It translates the provider onto Frame's contract and does nothing else: Frame owns validation, ordering, deduplication, outcomes and contexts.

## The contract

An adapter takes its types from `@priemskiyyy/frame/adapter`, which has no runtime names, so an adapter has no runtime dependency on the core.

```ts
import type {
  JsonRecord,
  WidgetAdapter,
  WidgetDefinition,
} from "@priemskiyyy/frame/adapter";

export const myWidget = <TName extends string, TData extends JsonRecord>(
  definition: WidgetDefinition<TName, TData>,
  { sdk, render }: MyWidgetOptions<NoInfer<TData>>,
): WidgetAdapter<TData, TName> => ({
  name: "my-provider",
  definition,
  open: () => {
    if (!sdk.isAvailable()) {
      return {
        status: "unavailable",
        reason: "The provider is not available on this platform.",
        remediation: "Run a development build.",
      };
    }

    const widget = sdk.createWidget(definition.name, render);

    return {
      status: "opened",
      session: {
        writeDomain: `my-provider:${definition.name}`,
        publish: (data) => {
          widget.update(data);

          return { status: "submitted", evidence: "sdk-call-returned" };
        },
      },
    };
  },
});
```

`open` answers a session, or the reason this runtime cannot host the widget. A session has:

| Member                                  | What it is                                                                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `writeDomain`                           | Names the physical resource whose writes can overwrite one another. Frame runs the calls of one write domain one at a time, across every session that names it. |
| `publishTimeline`, `reload`, `readback` | Optional. Leave one out and the handle answers `unavailable`. Frame never emulates it with a timer or a second provider call.                                   |
| `publish`                               | Submits one frozen, validated value and answers a `SubmissionResult`, synchronously or in a promise.                                                            |
| `dispose`                               | Optional. Takes back what `open` set up. Frame calls it once and nothing after it.                                                                              |

`publish` and `publishTimeline` are declared as methods, so an adapter for one definition fits where any is accepted.

## What a call answers

| Answer                               | When                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `{ status: "submitted", evidence }`  | The call returned. `sdk-call-returned` for a synchronous one, `sdk-promise-resolved` for a resolved promise, unless the SDK does not await the effect. |
| `{ status: "skipped", reason }`      | The provider reported nothing to draw, such as no placed widget.                                                                                       |
| `{ status: "failed", error }`        | Nothing reached the provider, such as a layout that threw before the call.                                                                             |
| `{ status: "indeterminate", error }` | The provider answered that effects are unknown.                                                                                                        |
| a thrown error or a rejection        | Left to throw. Frame answers `indeterminate`, because effects may have happened.                                                                       |

An answer that is not an object, or whose `status` is not one of these, is outside the contract: Frame answers `indeterminate` with a `FrameError` whose code is `INVALID_ANSWER`. The fields of a known status are not checked at run time, so `evidence` must be one of the three values, which the conformance suite checks.

## The rules

1. **The factory is cold.** Creating the adapter reads nothing, subscribes to nothing and calls nothing, so it may run at module scope. Opening is where a provider object is made.
2. **Take what the application set up.** The SDK option is `sdk`, typed structurally as `<Name>Like`, naming only what the adapter calls. Never import the provider at runtime, and never initialize, configure or close it.
3. **List only what the provider enforces.** Provide `timeline` only when the provider replaces a schedule, `reload` only when it can be asked to reload, and `readback` only when it can return what it stores. Never emulate an operation with a timer or a second provider call.
4. **State only what is known.** Name the boundary the call reached, and no further. A call that threw is `indeterminate`.
5. **Say when a runtime cannot host the widget.** Answer `unavailable` from `open`, with a reason and the remedy, instead of calling a native module that is not there. Where the provider has no probe of its own, take an `available` option the application answers.
6. **Name the write domain.** One stable string per native widget kind.
7. **Types before runtime checks.** What the types enforce is not checked again at runtime.

## Layout

```text
packages/adapters/<name>/
  LICENSE  README.md  package.json  tsconfig.json  tsdown.config.ts
  src/index.ts                     the factory and the public types, nothing else
  src/<factory>.ts                 the factory; every helper with logic lives in src/utils/
  src/<factory>.test.ts            mapping, evidence, errors, coldness, unavailability
  src/<name>.contracts.tsx         typecheck only, against the real SDK
  src/conformance.test.ts          testWidgetAdapter from @priemskiyyy/frame/testing
  src/index.test.ts                expect(Object.keys(api)).toEqual([...])
  src/fake<Sdk>.fixture.ts         an in-process fake modelled on a named SDK version
  src/types/<Name>Options.ts
  src/types/<Name>Like.ts
  src/utils/constants/<topic>.ts   provider names and fixed values, each with a one-line JSDoc
  src/utils/<helper>.ts            one arrow per file, named for what it returns or does
```

The `package.json` has no `dependencies`: the core is a peer at `>=0.1.0 <0.2` and a `workspace:*` dev dependency, and the provider SDK is an optional peer with a range that follows what was tested, such as `>=2.3.2 <3`. It sets `sideEffects: false`. The README has, in order: the name, one paragraph, Installation, Create an adapter, Options, Capabilities, How a call is mapped, What Frame does not normalize, Tests (what ran and what did not) and License.

## Prove it

- **Conformance.** Run `testWidgetAdapter` against the adapter with a fake of the SDK. See [testing](testing.md).
- **Contracts.** A typecheck-only file compiles the adapter against the real SDK's types, proves the real module fits the structural `Like` type and refuses a wrong object with `@ts-expect-error`.
- **A fake modelled on a named version.** Say which SDK version it models. A fake that does not implement the behavior under test makes that test vacuous.
- **Say what did not run.** The README lists what ran on a device and what did not. A fake is evidence about your code, not about a provider.
