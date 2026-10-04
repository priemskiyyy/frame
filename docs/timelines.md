---
description: Publish a schedule of entries, read back what a provider stores, and ask the host to redraw.
---

# Timelines, reload and readback

A snapshot is one value shown now. A timeline is a schedule: entries that say what to show from an instant on, replaced as a whole. Reload and readback are the two other operations a provider may offer. An adapter that lacks one answers `unavailable` for it, so the code that calls it does not change per platform.

| Operation                  | Expo | Voltra iOS    | Android widget |
| -------------------------- | ---- | ------------- | -------------- |
| `publish`, `reset`         | yes  | yes           | yes            |
| `publishTimeline(entries)` | yes  | yes           | `unavailable`  |
| `reload()`                 | yes  | yes           | `unavailable`  |
| `readback()`               | yes  | `unavailable` | `unavailable`  |

## Publish a timeline

```ts
const now = Date.now();

const outcome = await frame.widget("streak").publishTimeline([
  { at: now, data: { habit: "Run", days: 12 } },
  { at: now + 60 * 60 * 1000, data: { habit: "Run", days: 13 } },
]);
```

Frame checks the shape before any entry reaches your schema, and every entry's `data` is then validated like a publication:

- There is at least one entry, and at most `limits.entries` (64 by default).
- Each `at` is a safe integer of epoch milliseconds that a `Date` can hold.
- Instants strictly increase.
- The first entry is current or past, so something is shown the moment the timeline lands.

A timeline that breaks one of these ends `invalid` with reason `invalid-timeline` or `limit-exceeded`, and an issue path such as `entries[1].at` says which entry.

`get()` is the entry that is current when you call `publishTimeline`. Frame schedules nothing and never recomputes which entry is current, so `get()` does not move on when a later entry comes due: the host does that, and no provider says when it did.

Equal timelines are `unchanged` like equal snapshots, and the instants count: the same data at another instant is a new timeline.

## Reload

```ts
const outcome = await frame.widget("streak").reload();
```

`reload()` asks the host to redraw the widget. `submitted` means the host acknowledged the request, never that it rendered. It ends `skipped` with reason `no-placements` when the provider reports no placed widget.

## Readback

```ts
const outcome = await frame.widget("streak").readback();

if (outcome.status === "read") {
  console.log(outcome.entries, outcome.rejected);
}
```

`readback()` reads what the provider stores and parses each entry with your schema. `entries` holds only what the schema still accepts, and `rejected` counts what it refused, such as data an older build wrote under a different shape. An entry whose instant is not a safe integer counts as rejected too. Frame never repairs a stored value. Parsing happens after the provider answered and holds no write domain, and a schema that does not answer within the `timeout` ends the readback `failed`.

Readback is evidence about storage, not about the screen. It does not say the widget is showing what it read.

See [outcomes](outcomes.md) for every status these operations can end in.
