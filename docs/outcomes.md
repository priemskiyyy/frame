---
description: The eleven ways a publication ends, what each one proves, and the evidence a submission names.
---

# Outcomes

Every request ends in an outcome, and a request never rejects. An outcome says what Frame knows and no more, so the way to read one is to ask what it proves.

```ts
const outcome = await frame
  .widget("streak")
  .publish({ habit: "Run", days: 12 });
```

Every outcome carries `request: { id }`, such as `r7`, which also appears in diagnostics.

## The eleven

| Status          | What it proves                                                                                                                          | What to do                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `submitted`     | The adapter reached the boundary its `evidence` names, and no further. It never means the widget is on screen.                          | Nothing. Show the user the value you wanted shown, not a claim about the widget.   |
| `unchanged`     | The same content was already submitted for sure, so nothing was sent.                                                                   | Nothing, or `force: true` after something outside Frame changed the native widget. |
| `superseded`    | A newer request replaced this one before it reached the provider. `by` names it. It was never sent.                                     | Nothing: the newer request carries the value.                                      |
| `invalid`       | Frame refused the value before any provider call. `reason` and `issues` say why.                                                        | Fix the value, or the schema.                                                      |
| `skipped`       | The provider reported no placed widget, so nothing was drawn.                                                                           | Publish again once a widget is placed. It is not remembered as submitted.          |
| `unavailable`   | No adapter can host the widget here. Nothing was tried. `reason` and `remediation` say why and what to do.                              | Show the remediation, or hide the feature on this platform.                        |
| `failed`        | Nothing was written: a layout threw, an adapter threw while opening, or a readback's call or schema failed.                             | Fix the cause. Retrying is safe.                                                   |
| `indeterminate` | A provider call threw, rejected, outlived its deadline or was in flight at disposal. The widget may or may not have changed.            | Treat the widget as unknown. The next publish is sent, even with equal content.    |
| `blocked`       | An earlier provider call has not answered, so its write domain takes no new work. Nothing was tried.                                    | Wait for the domain to free itself, then publish again.                            |
| `expired`       | The context ended while the request waited to reach the provider, or for a readback to be parsed, so an old account's data cannot land. | Nothing: the new context has its own state.                                        |
| `disposed`      | The Frame was disposed before the request was handled.                                                                                  | Nothing.                                                                           |

The last six are what can stop any request, whether it asks for a publication, a timeline, a reload or a readback. They are exported together as `RequestFailure`.

## Invalid

An `invalid` outcome names one reason:

| Reason              | Meaning                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not-transportable` | The value is not plain JSON data: a function, symbol or bigint, a `Date`, `Map`, `Set` or class instance, a getter, a cycle, a sparse array, `undefined` in an array or a non-finite number. A record property that is `undefined` is dropped. |
| `limit-exceeded`    | The value is deeper, wider or larger than the Frame's limits (depth 64, 50000 values, 262144 bytes, 64 entries).                                                                                                                               |
| `schema-rejected`   | Your schema reported issues. Each issue has a `path` and a `message`.                                                                                                                                                                          |
| `schema-threw`      | Your schema threw, rejected, or did not answer within the Frame's `timeout`.                                                                                                                                                                   |
| `changed-value`     | The schema accepted the value but returned a different one, and each issue names a path that changed. Frame publishes your value, never a transformation.                                                                                      |
| `invalid-timeline`  | The timeline has no entries, repeats or reverses an instant, or its first entry is in the future.                                                                                                                                              |

Frame adds no value to an issue. A `schema-rejected` message is your schema's own text, so it can quote a value if the schema says so.

## Indeterminate

An `indeterminate` outcome has a `reason` and, when the provider threw, the `error`:

| Reason           | Meaning                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider-error` | The provider call threw, or its promise rejected. `error` is what it threw when that is an `Error`, and a `FrameError` with code `PROVIDER_FAILED` for any other thrown value, which is not kept. |
| `timeout`        | The call outlived the Frame's `timeout`. Its write domain stays held until it answers.                                                                                                            |
| `disposed`       | The Frame was disposed while the call was in flight. `error` is `null`.                                                                                                                           |

## Reload and readback

`reload()` ends `submitted` when the host acknowledged the request, never when it rendered, or `skipped` with reason `no-placements` when the provider has no placed widget. `readback()` ends `read` with `entries`, only the ones your schema still accepts, and `rejected`, how many it refused, such as data an older build wrote. Both can also end in any of the last six statuses above, and both answer `unavailable` on an adapter that lacks the operation.

## Evidence

A `submitted` outcome names the boundary it reached:

| Evidence               | Meaning                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `sdk-call-returned`    | A synchronous call into the SDK returned.                                                             |
| `sdk-promise-resolved` | The promise the SDK returned resolved.                                                                |
| `simulated`            | The mock adapter answered. It is never evidence about a device, which is why tests can tell it apart. |

No evidence says the host redrew.

## Why a throw is not a failure

`failed` means nothing reached the provider. A call that threw or rejected reached it, and a provider can store a payload and then throw while asking the host to reload. So Frame answers `indeterminate`, keeps the error and refuses to assume anything was undone. The next publish after an `indeterminate` or `skipped` outcome is always sent, because content is only `unchanged` against a submission that is known to have happened. After a `failed` one, equal content is still compared with the last submission that is known, because nothing reached the provider to change it.

## Reading the status instead

`widget.status.get()` carries the last outcome that was not `superseded` as `latest`, along with whether a value is wanted and what Frame is waiting on:

```ts
const { lifecycle, desired, work, latest } = frame
  .widget("streak")
  .status.get();
```

`work` is `blocked`, `submitting`, `validating` or `idle`, most urgent first.
