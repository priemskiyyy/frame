# Contributing

Use Node 22.18 or newer and the pnpm version in `package.json`. Run `pnpm install --frozen-lockfile`, then `pnpm check` before submitting a change, and read its output. `pnpm check` builds every package, then runs TypeScript, ESLint, the lint-rule probes, Prettier and the unit tests with coverage. `pnpm check:release` adds the mutation probes, the packed consumer, the documentation and the release metadata.

## Layout

- `packages/core`: the runtime, published as `@priemskiyyy/frame` with the `./adapter` (the contract an adapter implements, types only), `./mock` and `./testing` subpaths.
- `packages/react`: the provider and hooks, which hold no logic, published as `@priemskiyyy/frame-react`.
- `packages/adapters/*`: one package per provider, published as `@priemskiyyy/frame-<name>`. Packages share nothing privately.
- `examples/expo`: the Expo showcase, a streak widget on the home screen with a lab beside it.
- `docs/`: the guides, one page per concept.
- `scripts/`: the repository checks. `verify-lint-rules.mjs` lints probes with the real ESLint config and proves every rule in both directions. `mutate.mjs` breaks one invariant at a time and expects a test to go red. `verify-packages.mjs` installs the packed tarballs into an empty project. `verify-docs.mjs` and `verify-release.mjs` check the pages and the release metadata.

Runtime owners and helpers live in `src/utils/`, shared helpers in `src/utils/common/`, constants in `src/utils/constants/<topic>.ts` as UPPER_SNAKE values, and public types in `src/types/`, one type per file. Internal contracts belong in each folder's `internal/` directory, so `src/types/internal/` holds the types no consumer sees and `src/utils/internal/<topic>/` the machinery no consumer may import. The core's mock adapter and test clock live in `src/mock/` and the conformance suite in `src/testing/`. Typecheck-only expectations sit beside their sources as `*.contracts.ts`, or `.tsx` where they use JSX.

Package roots export the supported public API explicitly, one export per file and no `export *`, and no other file is a barrel. The entry points are `src/index.ts` and the core's `src/adapter.ts`, `src/mock.ts` and `src/testing.ts`. `src/index.test.ts` pins each entry's runtime names with `Object.keys`.

Every `exports` entry is `types`, then `import`, then `default`, with `import` and `default` on the same ESM file. Every package is version `0.1.0` under the MIT license, and the core has zero runtime dependencies.

## Code

ESLint enforces every rule it can check, and `pnpm test:lint` proves each one with a probe it must reject and, where a rule has exceptions, one it must allow. It also fails when a selector, a restricted global or a restricted import has no probe. Change a rule and its probes together.

- **ESLint** (the siblings' rules): `type` over `interface`, no `enum`, `switch`, `any`, `unknown`, `as` (including `as const`), angle-bracket assertions, non-null `!`, `void` operator, `??=`, `||=`, `&&=`, `readonly` in any form, `export *`, relative imports, re-exports outside the entry points, a default export, module-level `let`, a second export in one file (a constants file, an overloaded function and `Register` excepted), `.filter().map()` and `.map().filter()`, a ternary as a return value or an arrow body, a function or loop body that ends in an `if` without an `else`, or a constructor conversion (`Number()`, `String()`, `Boolean()`, `BigInt()`, `Object()`, called or passed as a callback: parse with `Number.parseInt`, format with `toString()`, compare for a boolean); `curly: all`; `no-else-return`; `consistent-type-imports`; no inline ESLint configuration; the Hermes and React Native gaps (`AbortSignal`, `structuredClone`, `toSorted`, `Object.groupBy`, `Promise.withResolvers`, `crypto`, `Intl`, `TextDecoder`, async-arrow parameters); clock, timer and `Math.random` uses outside the `clock` option; host globals in shipped code; runtime imports of provider SDKs, `react` outside the React package, the core's main entry from an adapter's source, and test runners in package sources; and `setImmediate` and `console` in shipped code, the core's `mock` and `testing` subpaths from an adapter's or React's source, `describe` and `it` in tests, an exported function declaration, a class method that is not an arrow field, a module-level `Map` or `Set`, an `if` that ends a `try` or `catch` block, a private or Frame noun identifier ending in `Id` or `Key`, an optional public field not typed `| undefined`, and the blank-line rule around declarations, blocks and returns.
- **Comments**: none, except a provider quirk or a reason the code cannot say, in one line. Public exports carry a JSDoc of one or two sentences and an `@example`; a field whose contract its name cannot say carries a one-line JSDoc; a constant carries a one-line JSDoc naming the fact it encodes.
- **Code**: early returns and no `else` after a return; exhaustive dispatch closed by `assertUnreachable` or a `satisfies Record<...>` table; helpers named for exactly what they return or do; handlers named `handle*`; arrow functions exported one per file; classes only for stateful owners, with `#private` fields and public members as arrow fields; no default exports; no module-level mutable state; `src/...` imports inside a package; grouped options; published data frozen at runtime. No runtime check for what the contract or the types already guarantee: only what no type can say (ranges, grammar, values from outside) is checked, once, at its boundary.
- **Data**: a lifecycle discriminates on `state`, an outcome on `status`, a payload on `kind`. A diagnostic event discriminates on `type`, and the mock's `MockCall.operation` and `MockPlan.outcome` are test-side vocabularies, so those three are the carve-outs of that rule. Public discriminant values are lowercase and kebab. Error codes are UPPER_SNAKE. Published data uses `T | null`; inputs use optional fields typed `?: T | undefined`, except a `*Like` type that mirrors a provider's own output, which keeps the provider's `?: T`. Time is epoch milliseconds, and durations are milliseconds. Types carry no `readonly`.
- **Prose**: keep sentences concise and use commas, colons or separate sentences instead of em dashes.

Frame never throws into its host at runtime. The only synchronous throw is `FrameError` with `INVALID_CONFIGURATION`, for a definition, options, an adapter for a widget the Frame does not list, a widget key that cannot work, or a hook outside a `FrameProvider`. `publish` and every other request resolves with an outcome, and the promise never rejects.

## Adapters

An adapter is a plain `{ name, definition, open }`, typed by the definition's name and data so a Frame can refuse one for a widget it does not list. `open` answers a session, or the reason this runtime cannot host the widget. A session is `{ writeDomain, publish, publishTimeline, reload, readback, dispose }`, and everything but `writeDomain` and `publish` is optional. A handle is the same on every platform, so an operation the hosting adapter leaves out answers `unavailable`. A Frame takes an ordered list of adapters and hosts each widget with the first one whose `open` answers a session. An adapter takes its types from `@priemskiyyy/frame/adapter`, which has no runtime names, and never imports the core's main entry. The rules:

1. **The factory is cold.** Creating the adapter reads nothing, subscribes to nothing and calls nothing. It may run at module scope. Opening is where a provider object is made.
2. **Take what the application set up.** The SDK option is `sdk`, typed structurally as `<Name>Like`, naming only what the adapter calls. Never import the provider at runtime, never initialize, configure or close it. A typecheck-only `<name>.contracts.tsx` proves the real SDK fits the structural type and refuses a wrong object with `@ts-expect-error`. Where the SDK has no platform probe of its own, the adapter takes an `available` option the application answers.
3. **List only what the provider enforces.** An adapter provides `timeline` only when the provider replaces a schedule, `reload` only when it can be asked to reload, and `readback` only when it can return what it stores. Never emulate an operation with a timer or a second provider call.
4. **State only what is known.** `sdk-call-returned` when a synchronous call returned, `sdk-promise-resolved` when the provider's promise resolved, and `sdk-call-returned` when the SDK does not await the effect it asks for, as the Android adapter's does not. A provider call that threw or rejected is `indeterminate`: effects may have happened. Answer `failed` only when nothing reached the provider, such as a render function that threw before the call.
5. **Say when a runtime cannot host the widget.** A platform without the provider answers `unavailable` from `open`, with a reason and the remedy, instead of calling a native module that is not there, so Frame moves on to the next adapter. A silent success is a defect.
6. **Name the write domain.** One stable string per native widget kind. Two sessions of one adapter share it, and Frame runs their calls one at a time.
7. **Types before runtime checks.** What the types enforce is not checked again at runtime.

Every adapter package has this layout:

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
  src/utils/constants/<topic>.ts   provider names and fixed values, UPPER_SNAKE, each with a one-line JSDoc
  src/utils/<helper>.ts            one arrow per file, named for what it returns or does
```

Its `package.json` has no `dependencies`: the core is a peer at `>=0.1.0 <0.2` plus a `workspace:*` dev dependency, and the provider SDK is an optional peer with a range that follows what was tested, such as `>=2.3.2 <3` or `>=0.22.1 <0.23`, pinned exactly only as a root dev dependency. It sets `sideEffects: false`. Its README has, in order: `# @priemskiyyy/frame-<name>`, one paragraph, Installation, Create an adapter, Options (table), Capabilities (table: platforms, operations, evidence), How a call is mapped (table), What Frame does not normalize, Tests (what ran and what did not), License.

## Testing

`pnpm test:unit` runs one Vitest project per package, each with a `src` alias onto its own source. Every folder under `packages/adapters` with a `package.json` is a project without being listed. Adapter and React tests import the core by its package name, so run `pnpm build` first.

A new test is watched failing once before it is trusted. When the implementation came first, break it on purpose and confirm the test goes red: `pnpm test:mutation` keeps a list of those breaks for the invariants that matter, so add a mutant when you add an invariant. A bare `toHaveBeenCalled()` is not an assertion; assert the calls with their arguments. A `@ts-expect-error <reason>` suppresses only the next line, so it sits on the line where the error is reported, and a negative case counts only when the whole file compiles. A fake that does not implement the behavior under test makes that test vacuous. Device tests are separate evidence and are never replaced by a fake: the README of every adapter says what ran on a device and what did not.

## Documentation

Every page under `docs/` starts with a frontmatter `description`, has one `h1`, links to sibling pages as `page.md` and shows snippets that compile against the current API. Documentation examples must compile against the current API. Use commas, colons or separate sentences instead of em dashes.
