---
description: Register your Frame once, provide it, and read widgets by key with hooks that only observe.
---

# React

`@priemskiyyy/frame-react` is a provider and five hooks. They only observe: mounting a component opens no adapter, publishes nothing and calls no provider.

## Register your Frame

The hooks name a widget by its key, so they need your Frame's type. Say it once, next to the Frame:

```ts
import { Frame } from "@priemskiyyy/frame";

// `streak` and `adapters` are the widget and the adapters of getting started.
export const frame = new Frame({ widgets: { streak }, adapters });

declare module "@priemskiyyy/frame-react" {
  interface Register {
    frame: typeof frame;
  }
}
```

Until `Register` names a Frame, TypeScript refuses to give the provider one, so registration cannot be forgotten. Every platform's Frame has the same type, because adapters are not part of it, so a Frame with other adapters, or with none, fits wherever the registered one does. A Frame whose widgets are not the registered ones, by name and by data, is refused too, because the hooks would type their data from the wrong Frame.

## Provide it

```tsx
import { FrameProvider } from "@priemskiyyy/frame-react";

export const Root = () => (
  <FrameProvider frame={frame}>
    <Application />
  </FrameProvider>
);
```

The provider publishes one Frame to the tree and does nothing else. Whoever constructed the Frame prepares and disposes it. Passing a different Frame, such as one for another provider, switches every hook below it.

## Read a widget

`Button` below is your own component, not React Native's.

```tsx
import {
  useWidget,
  useWidgetData,
  useWidgetStatus,
} from "@priemskiyyy/frame-react";

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

| Hook                    | Returns                                                                                     | Renders again when                   |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `useFrame()`            | The Frame, to change its context or read its diagnostics.                                   | The provider is given another Frame  |
| `useWidget(key)`        | The widget's handle in the current context, to publish to.                                  | A context change replaces the handle |
| `useWidgetData(key)`    | What Frame wants shown, or `null` before anything is accepted and on the server.            | That value changes                   |
| `useWidgetStatus(key)`  | The lifecycle, whether a value is wanted, what Frame waits on and the last outcome.         | Any of those change                  |
| `useFrameDiagnostics()` | The frame's snapshot for a debug screen: each widget's hosting adapter, lifecycle and work. | The snapshot changes                 |

Pick the hook for what the component shows. A button that only publishes reads `useWidget` and does not render for data or status. `useWidgetData` ignores a publication of equal content, so publishing it twice renders once. `useWidgetStatus` and `useFrameDiagnostics` also change with the work and the latest outcome, so an equal publication renders them again.

## Accounts

A handle ends with its context. Changing the account is a context change, and the hooks follow it:

```tsx
const SwitchAccount = ({ account }: { account: Account }) => {
  const frame = useFrame();

  const handlePress = () => {
    frame.context({ reset: "fallback" });
  };

  return <Button label={`Switch to ${account.name}`} onPress={handlePress} />;
};
```

The old handle stops at once and never publishes into the new context. `useWidget` renders again with the new handle, and `useWidgetData` and `useWidgetStatus` follow it, so a component never shows the previous account's data. A request the old account had not sent yet ends `expired`.

## Strict Mode and the server

Strict Mode mounts twice without duplicating subscriptions or opening an adapter. On the server and during hydration, `useWidgetData` is `null` and `useWidgetStatus` is idle, so the markup matches whatever the client has already published by the time it hydrates.

## Misuse

A hook outside a `FrameProvider` throws `FrameError` with `INVALID_CONFIGURATION` and the message `Frame hooks must be used within a FrameProvider.` It is a wiring mistake, not a runtime condition.
