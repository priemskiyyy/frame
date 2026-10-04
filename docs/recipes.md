---
description: Short answers to what an application does with Frame: prepare at launch, mirror state to a widget, say when a widget is unsupported, open a screen from a tap, switch accounts.
---

# Recipes

Each recipe assumes a Frame with one widget, `streak`, and a registered `frame` for the React hooks, as in [getting started](getting-started.md).

## Prepare at launch

An adapter opens at the first publish. Some providers keep the layout they last registered until they are opened, even after an app update, so open at launch:

```ts
const { widgets } = await frame.prepare();

if (widgets.streak.status === "unavailable") {
  console.log(widgets.streak.reason, widgets.streak.remediation);
}
```

`prepare()` never rejects. `unavailable` is the adapter's own answer, `failed` means opening threw, and preparing again after either asks the adapters again.

## Mirror application state to the widget

Publish when your state changes and let Frame deduplicate. Equal content ends `unchanged` without a provider call, and a request still waiting when a newer one arrives ends `superseded`, so there is no throttling to write:

```tsx
import { useEffect } from "react";
import { useWidget } from "@priemskiyyy/frame-react";

const StreakSync = ({ days }: { days: number }) => {
  const streak = useWidget("streak");

  useEffect(() => {
    streak.publish({ habit: "Run", days });
  }, [streak, days]);

  return null;
};
```

`useWidget` returns the handle of the current context, so the effect runs again with the new handle after an account change, and never publishes through an old one.

## Say when a widget is unsupported here

Once the Frame has prepared, the lifecycle says whether this runtime can host the widget: until `prepare()` or a first publish it is `idle`. A Frame with no adapter answers `unavailable` from the start, so a first render can say so:

```tsx
import { useWidgetStatus } from "@priemskiyyy/frame-react";

const WidgetSupport = () => {
  const { lifecycle } = useWidgetStatus("streak");

  if (lifecycle.state !== "unavailable") {
    return null;
  }

  return <Text>{`${lifecycle.reason} ${lifecycle.remediation ?? ""}`}</Text>;
};
```

## Open a screen when the widget is tapped

A tap belongs to the layout, so a handle has no press handler. Put the destination in the widget's data, where the schema validates it, and let each layout attach it with its provider's own primitive:

```ts
export const streak = widget({
  name: "StreakWidget",
  schema: z.object({
    habit: z.string().min(1).max(24),
    days: z.number().int().nonnegative(),
    url: z.url(),
  }),
  fallback: { habit: "Run", days: 0, url: "myapp://streak" },
});
```

```tsx
// Expo: one widgetURL modifier for the whole widget, inside the "widget" function.
import { Text, VStack } from "@expo/ui/swift-ui";
import { widgetURL } from "@expo/ui/swift-ui/modifiers";

const StreakView: ExpoLayout<StreakData> = (props) => {
  "widget";

  return (
    <VStack modifiers={[widgetURL(props.url)]}>
      <Text>{`${props.days} day streak`}</Text>
    </VStack>
  );
};

// Voltra: a Link around the content of each family.
const render: VoltraLayout<StreakData> = (data) => ({
  systemSmall: (
    <VoltraClient.Voltra.Link destination={data.url}>
      <VoltraClient.Voltra.Text>{`${data.days} days`}</VoltraClient.Voltra.Text>
    </VoltraClient.Voltra.Link>
  ),
});

// Android: a click action on any element.
const StreakView: AndroidLayout<StreakData> = (data) => (
  <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: data.url }}>
    <TextWidget text={`${data.days} days`} />
  </FlexWidget>
);
```

The app receives the URL like any other link, through `Linking` or your router, so give the app a `scheme` and handle the route as you would for a push notification. Because `url` is data, it is validated, deduplicated and swapped with the rest of the publication, and `reset()` restores the fallback's. Frame does not wrap taps: that would put a second, provider-shaped API beside the one each SDK already documents. Voltra also takes a `deepLinkUrl` per widget entry, which the adapter does not pass today.

## Switch accounts

A context is the boundary between one account's data and the next. End it when the account changes:

```ts
await frame.context({ reset: "fallback" });
```

Every handle of the old context ends at once, a request it had not sent expires, and each widget is replaced with its fallback so the next account never sees the last one's data. The hooks render again with the new handles. Use `reset: "preserve"` only for content that is the same for every account.

The report says which resets landed:

```ts
const { widgets } = await frame.context({ reset: "fallback" });

if (widgets.streak?.status !== "submitted") {
  console.warn("The old account's widget may still be showing.");
}
```

## Tell the user what is known

An outcome names what Frame knows, so a message can too:

```ts
const outcome = await frame.widget("streak").publish({ habit: "Run", days });

if (outcome.status === "submitted") {
  return "Sent to the widget";
}

if (outcome.status === "unavailable") {
  return outcome.remediation ?? outcome.reason;
}

if (outcome.status === "indeterminate") {
  return "The widget may or may not have updated";
}

return outcome.status;
```

Do not turn `submitted` into "the widget is up to date": no provider says what the host displays.

## Show which adapter hosts a widget

For a debug screen, `useFrameDiagnostics` reads the frame's snapshot. It names the hosting adapter, the lifecycle and the work of each widget, and never carries a value a widget shows:

```tsx
import { useFrameDiagnostics } from "@priemskiyyy/frame-react";

const HostingAdapter = () => {
  const { widgets } = useFrameDiagnostics();

  return <Text>{widgets.streak.adapter?.name ?? "No adapter yet"}</Text>;
};
```
