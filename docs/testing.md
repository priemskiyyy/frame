---
description: Test code that publishes to widgets with the mock adapter and test clock, and prove an adapter with the conformance suite.
---

# Testing

Frame ships what you need to test an application and what an adapter author needs to prove an adapter. None of it touches a device. The snippets assume the `streak` widget of [getting started](getting-started.md).

## Running the tests

The packages are ESM only. Vitest and Node's own test runner load them as they are. Jest, which a React Native app runs by default, does not transform `node_modules` unless it is told to, so add the packages to `transformIgnorePatterns`:

```js
// jest.config.js
module.exports = {
  preset: "react-native",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@priemskiyyy)/)",
  ],
};
```

## The mock adapter

`createMockAdapter` returns an adapter and the test's side of it, `control`. Give two mocks a `name` to tell them apart in diagnostics:

```ts
import { Frame } from "@priemskiyyy/frame";
import { createMockAdapter } from "@priemskiyyy/frame/mock";

const { adapter, control } = createMockAdapter(streak);
const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

await frame.widget("streak").publish({ habit: "Run", days: 12 });

expect(control.calls()).toEqual([
  { operation: "publish", data: { habit: "Run", days: 12 } },
]);
expect(control.stored()).toEqual([{ at: 0, data: { habit: "Run", days: 12 } }]);
```

The mock provides every operation, answers `simulated` evidence, and records exactly what Frame handed it. It never claims anything about a device.

| Control            | What it does                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `script(...plans)` | Plans the next calls, in order. An unplanned call succeeds.                                        |
| `held()`           | The calls waiting on `hold`, oldest first. Each can be released, failed, left uncertain or thrown. |
| `calls()`          | Every call received so far, with what Frame handed it.                                             |
| `stored()`         | What the simulated provider holds: a succeeded publication or schedule.                            |
| `seed(entries)`    | Puts entries in place without a call, as another writer would.                                     |
| `sessions()`       | Sessions opened and not yet disposed, to prove a handle read opens nothing.                        |

## Failures on command

A plan says how the next call ends:

```ts
control.script({ outcome: "fail", error: new Error("refused") });
control.script({ outcome: "indeterminate", stored: true });
control.script({ outcome: "throw", error: new Error("crashed") });
control.script({ outcome: "skip" });
control.script({ outcome: "hold" });
```

`fail` is a call that never reached the provider, so the request ends `failed`. `indeterminate` and `throw` are calls that did, so it ends `indeterminate`, and `stored: true` says the effect landed anyway. `skip` is a provider with no placed widget. `hold` waits for you, which is how a test interleaves requests without sleeping. `settle` lets the promises that are ready run, a fixed number of turns, so the first call has reached the provider before the second request arrives; a request still waiting when a newer one arrives is `superseded`:

```ts
import { settle } from "@priemskiyyy/frame/mock";

control.script({ outcome: "hold" });

const first = widget.publish({ habit: "Run", days: 1 });

await settle();

const second = widget.publish({ habit: "Run", days: 2 });

control.held()[0]?.release();

expect((await first).status).toBe("submitted");
expect((await second).status).toBe("submitted");
```

## Time

Frame reads every instant and timer through its `clock` option, so a test controls time:

```ts
import { createTestClock, settle } from "@priemskiyyy/frame/mock";

const clock = createTestClock({ now: 1_760_000_000_000 });
const frame = new Frame({
  widgets: { streak },
  adapters: [adapter],
  clock,
  timeout: 500,
});

control.script({ outcome: "hold" });
const stuck = frame.widget("streak").publish({ habit: "Run", days: 1 });

await settle();
clock.advance(500);

expect((await stuck).status).toBe("indeterminate");
```

`advance` runs every timer that falls due, in order, and a call's timer starts when the call does, so `settle` first. Library code never calls `Date.now()` or the host's timers, and ESLint refuses them outside the system clock.

## Unavailable runtimes

```ts
const { adapter } = createMockAdapter(streak, {
  unavailable: { reason: "No widget host.", remediation: "Run on a device." },
});
```

A Frame with this adapter, or with none, publishes `unavailable` and calls nothing.

## React

Render hooks inside a provider of a Frame built over the mock. The hooks only observe, so a test can mount them and assert that nothing was opened:

```tsx
const { result } = renderHook(() => useWidgetData("streak"), {
  wrapper: ({ children }) => (
    <FrameProvider frame={frame}>{children}</FrameProvider>
  ),
});

expect(control.sessions()).toBe(0);
```

## The conformance suite

An adapter author proves an adapter with `testWidgetAdapter`, which runs the checks every adapter must pass: creating the adapter calls the provider nothing, every opening is a fresh session in one write domain, a snapshot is submitted with evidence, a Frame publishes through the adapter, a failing provider call is never answered `submitted`, the timeline, reload and readback it provides work, disposing releases a session once, and an unavailable adapter answers its reason without a provider call. `fake` stands for a fake of your provider's SDK, one you write and model on a named version of it: `createFakeExpoWidgets` is the one in this repository's Expo adapter tests, and the layout `render` is yours.

```ts
import { testWidgetAdapter } from "@priemskiyyy/frame/testing";

let fake = createFakeExpoWidgets();

const { passed, skipped } = await testWidgetAdapter({
  name: "expo",
  create: () => {
    fake = createFakeExpoWidgets();

    return expoWidget(streak, { sdk: fake.sdk, render });
  },
  calls: () => fake.calls.length,
  failNextCall: () => fake.failNext(new Error("native failure")),
  createUnavailable: () => {
    fake = createFakeExpoWidgets({ widgetsDirectory: "" });

    return expoWidget(streak, { sdk: fake.sdk, render });
  },
});
```

A failing check throws, so a test that awaits it fails with the check's name. `skipped` lists checks that do not apply: the failing-call check when the harness gives no `failNextCall`, the unavailability check when it gives no `createUnavailable`, and the check for a timeline, a reload or a readback the adapter does not have.

## Device tests

A fake is evidence about your code, not about a provider. A fake that does not implement the behavior under test makes that test vacuous, and the mock's `simulated` evidence exists so a test can never mistake it for a device. Run the example app on a simulator or a device for the rest, and say in your adapter's README what ran and what did not.
