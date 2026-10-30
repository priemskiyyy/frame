# @priemskiyyy/frame-react

A provider and hooks that read a Frame from React and React Native. They only observe: mounting a component opens no adapter, publishes nothing and calls no provider. They are safe in Strict Mode and on the server.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/frame/blob/main/docs/limitations.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/frame-react
```

It needs `react` `>=19.2 <20` and `@priemskiyyy/frame`.

## Register your Frame

The hooks name a widget by its key, so they need to know your Frame's type. Say it once, next to the Frame:

```ts
import { Frame } from "@priemskiyyy/frame";

export const frame = new Frame({ widgets: { streak }, adapters });

declare module "@priemskiyyy/frame-react" {
  interface Register {
    frame: typeof frame;
  }
}
```

Until `Register` names a Frame, TypeScript refuses to give the provider one, so registration cannot be forgotten. Every platform's Frame has the same type, so a Frame with other adapters, or with none, is accepted wherever the registered one is.

## Provide it

```tsx
import { FrameProvider } from "@priemskiyyy/frame-react";

export const Application = () => (
  <FrameProvider frame={frame}>
    <Screen />
  </FrameProvider>
);
```

The provider publishes one Frame to the tree and does nothing else. Whoever constructed the Frame prepares and disposes it. Giving the provider a different Frame switches every hook below it to that one.

## Hooks

`Button` below is your own component, not React Native's.

```tsx
const Streak = () => {
  const streak = useWidget("streak");
  const data = useWidgetData("streak");
  const { work, latest } = useWidgetStatus("streak");

  return (
    <Button
      disabled={work !== "idle"}
      label={data === null ? "Publish" : `${data.days} days`}
      onPress={() => streak.publish({ habit: "Run", days: 12 })}
    />
  );
};
```

| Hook                    | Returns                                                                                                 | Renders again when                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `useFrame()`            | The Frame, to change its context or read its diagnostics. Throws outside a provider.                    | The provider is given another Frame        |
| `useWidget(key)`        | The widget's handle in the current context, to publish to.                                              | The handle is replaced by a context change |
| `useWidgetData(key)`    | What Frame wants shown, or `null` before anything is accepted and on the server.                        | That value changes                         |
| `useWidgetStatus(key)`  | The lifecycle, whether a value is wanted, what Frame waits on and the last outcome. Idle on the server. | Any of those change                        |
| `useFrameDiagnostics()` | The frame's snapshot for a debug screen: each widget's hosting adapter, lifecycle and work.             | The snapshot changes                       |

A component that only publishes reads `useWidget` and does not render for data or status. `useWidgetData` ignores a publication of equal content, so publishing it twice renders once. `useWidgetStatus` and `useFrameDiagnostics` also change with the work and the latest outcome, so an equal publication renders them again.

## After a context change

A handle ends with its context, so one you kept goes stale after `frame.context()`. `useWidget` renders again with the new handle, and its data and status hooks follow it, so a component never shows the previous account's data.

```tsx
const SignOut = () => {
  const frame = useFrame();

  return (
    <Button
      label="Sign out"
      onPress={() => frame.context({ reset: "fallback" })}
    />
  );
};
```

## Outside a provider

A hook used outside a `FrameProvider` throws `FrameError` with `INVALID_CONFIGURATION` and the message `Frame hooks must be used within a FrameProvider.` It is a wiring mistake, not a runtime condition.

## License

[MIT](LICENSE)
