---
description: Install Frame, describe a widget, publish typed data to a home screen widget and read what happened.
---

# Getting started

This page takes one widget from nothing to a published value on an iOS home screen, then reads the outcome. It uses Expo and `expo-widgets`; [adapters](adapters.md) lists the other providers.

You need an Expo app on SDK 57 built as a development build, because Expo Go cannot host widgets, TypeScript 5.4 or newer, and React 19.2 for the hooks. Frame never configures `expo-widgets`: set it up as its own documentation says, with the config plugin, an App Group and a widget declared with the same name as the definition below.

## Install

```sh
pnpm add @priemskiyyy/frame @priemskiyyy/frame-expo @priemskiyyy/frame-react expo-widgets @expo/ui zod
```

Any [Standard Schema](https://standardschema.dev) library works in place of `zod`.

## Describe the widget

A widget is what you can show, described once. The same description serves every platform. Put it in `widgets/streak.ts`:

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

`name` is the widget kind the provider installs. `schema` describes the final value, and a value it would change is refused, not fixed. `fallback` is what `reset()` shows.

## Say what draws it

An adapter draws one widget through one provider. The `render` function is the widget's layout. Put the Frame in `frame.ts`:

```tsx
import { Frame } from "@priemskiyyy/frame";
import { expoWidget } from "@priemskiyyy/frame-expo";
import type { ExpoLayout } from "@priemskiyyy/frame-expo";
import { Text, VStack } from "@expo/ui/swift-ui";
import * as ExpoWidgets from "expo-widgets";

import { streak } from "./widgets/streak";

const StreakView: ExpoLayout<{ habit: string; days: number }> = (props) => {
  "widget";

  return (
    <VStack>
      <Text>{props.habit}</Text>
      <Text>{`${props.days} day streak`}</Text>
    </VStack>
  );
};

export const frame = new Frame({
  widgets: { streak },
  adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
});
```

Constructing the Frame and the adapter calls nothing. The adapter opens at the first publish, or when you call `frame.prepare()`. Call it once when the app starts, because the widget extension keeps the layout it last registered until the adapter opens:

```ts
const { widgets } = await frame.prepare();
```

## Publish

Publish from a handler or an effect, because `await` needs an async function:

```ts
const handlePublishPress = async () => {
  const outcome = await frame
    .widget("streak")
    .publish({ habit: "Run", days: 12 });

  if (outcome.status === "submitted") {
    console.log(`Revision ${outcome.revision}, evidence ${outcome.evidence}`);
  }

  if (outcome.status === "invalid") {
    console.log(outcome.issues);
  }
};
```

`publish` never rejects. It resolves with an outcome that says what Frame knows. A `submitted` outcome with `sdk-call-returned` means the call into `expo-widgets` returned. It does not mean the widget redrew; no provider says that. [Outcomes](outcomes.md) lists all eleven.

## Read it in React

Register the Frame once, provide it, and read the widget by its key:

```tsx
import {
  FrameProvider,
  useWidgetData,
  useWidgetStatus,
} from "@priemskiyyy/frame-react";
import { Text } from "react-native";

import { frame } from "./frame";

declare module "@priemskiyyy/frame-react" {
  interface Register {
    frame: typeof frame;
  }
}

export const Application = () => (
  <FrameProvider frame={frame}>
    <Streak />
  </FrameProvider>
);

const Streak = () => {
  const data = useWidgetData("streak");
  const { work } = useWidgetStatus("streak");

  return (
    <Text>
      {data === null ? "Nothing shown yet" : `${data.days} days (${work})`}
    </Text>
  );
};
```

Render `Application` at the root of your app. `work` is what Frame is waiting on: `idle`, `validating`, `submitting` or `blocked`. [React](react.md) covers `Register`, the provider and every hook.

## Test it

```ts
import { Frame } from "@priemskiyyy/frame";
import { createMockAdapter } from "@priemskiyyy/frame/mock";

import { streak } from "./widgets/streak";

const { adapter, control } = createMockAdapter(streak);
const testFrame = new Frame({ widgets: { streak }, adapters: [adapter] });

await testFrame.widget("streak").publish({ habit: "Run", days: 3 });

expect(control.calls()).toEqual([
  { operation: "publish", data: { habit: "Run", days: 3 } },
]);
```

The mock records every call, can hold, fail or hang on command, and answers `simulated` evidence, which is never evidence about a device. [Testing](testing.md) shows the rest, including how to run these tests under Jest.

## Next

- [Mental model](mental-model.md): widgets, adapters, handles and contexts
- [Recipes](recipes.md): prepare at launch, mirror state to a widget, switch accounts
- [Adapters](adapters.md): serving iOS and Android from one Frame
