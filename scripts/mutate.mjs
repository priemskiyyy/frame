// Semantic mutation probes. Each one breaks a single invariant in the source,
// and the project that owns it must go red, or the test that guards the
// invariant is missing or vacuous. A mutation never stays in the checkout,
// including when a probe is interrupted or fails.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

const MUTANTS = [
  {
    describes: "equal content is no longer answered unchanged",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "if (!force && this.#lastSubmitted === replacement.canonical) {",
    replace: "if (false) {",
  },
  {
    describes: "force no longer sends equal content again",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "if (!force && this.#lastSubmitted === replacement.canonical) {",
    replace: "if (this.#lastSubmitted === replacement.canonical) {",
  },
  {
    describes: "a skipped submission is remembered as submitted content",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: 'if (outcome.status !== "indeterminate" && outcome.status !== "skipped") {',
    replace: 'if (outcome.status !== "indeterminate") {',
  },
  {
    describes: "an older request is no longer superseded by a newer one",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "if (newest !== null && request.sequence < newest.sequence) {",
    replace: "if (false) {",
  },
  {
    describes: "a schema that changes the value is accepted",
    file: "packages/core/src/utils/internal/validation/validateSnapshot.ts",
    find: "if (captured.canonical === canonical) {",
    replace: "if (true) {",
  },
  {
    describes: "timeline instants may repeat",
    file: "packages/core/src/utils/internal/validation/validateTimeline.ts",
    find: "if (entry.at <= previous) {",
    replace: "if (entry.at < previous) {",
  },
  {
    describes: "an empty timeline is accepted",
    file: "packages/core/src/utils/internal/validation/validateTimeline.ts",
    find: "if (!Array.isArray(entries) || entries.length === 0) {",
    replace: "if (!Array.isArray(entries)) {",
  },
  {
    describes: "a request behind a hung call is no longer blocked",
    file: "packages/core/src/utils/internal/lanes/Lane.ts",
    find: 'if (this.isBlocked()) {\n      return this.#refuse(task, { status: "blocked" });',
    replace:
      'if (false) {\n      return this.#refuse(task, { status: "blocked" });',
  },
  {
    describes: "the depth limit is not enforced",
    file: "packages/core/src/utils/internal/transport/SnapshotWalker.ts",
    find: "if (depth > this.#limits.depth) {",
    replace: "if (false) {",
  },
  {
    describes: "the node limit is not enforced",
    file: "packages/core/src/utils/internal/transport/SnapshotWalker.ts",
    find: "if (this.#nodes > this.#limits.nodes) {",
    replace: "if (false) {",
  },
  {
    describes: "the byte limit is not enforced on the whole value",
    file: "packages/core/src/utils/internal/transport/SnapshotWalker.ts",
    find: "if (getUtf8Length(walked.text) > this.#limits.bytes) {",
    replace: "if (false) {",
  },
  {
    describes: "a context change no longer retires the old handles",
    file: "packages/core/src/utils/Frame.ts",
    find: "runtime.retire();",
    replace: "runtime.summarize();",
  },
  {
    describes: "the old handles are retired before the next ones exist",
    file: "packages/core/src/utils/Frame.ts",
    find: "const retiring = [...this.#runtimes.values()];\n    const next = new Map<string, WidgetRuntime>();",
    replace:
      "const retiring = [...this.#runtimes.values()];\n\n    for (const runtime of retiring) {\n      runtime.retire();\n    }\n\n    const next = new Map<string, WidgetRuntime>();",
  },
  {
    describes: "preserving a context still resets the widgets",
    file: "packages/core/src/utils/Frame.ts",
    find: 'reset === "fallback"\n        ? [...next]',
    replace: "true\n        ? [...next]",
  },
  {
    describes:
      "an unavailable adapter ends the search instead of the next one being tried",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "refusals.push({ adapter, ...opening });\n\n          continue;",
    replace: "refusals.push({ adapter, ...opening });\n\n          break;",
  },
  {
    describes:
      "preparing again no longer asks an unavailable widget's adapters again",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: '(cached.status !== "unavailable" || !retry || this.#adapters.length === 0)',
    replace: "true",
  },
  {
    describes:
      "a failed open is remembered, so the next publish does not try again",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: 'this.#cached = null;\n    this.#set(Object.freeze({ state: "failed", error }));',
    replace:
      'this.#cached = Object.freeze({ status: "failed", error });\n    this.#set(Object.freeze({ state: "failed", error }));',
  },
  {
    describes: "several refusals are answered with only the first one's reason",
    file: "packages/core/src/utils/internal/widgets/getUnavailableAnswer.ts",
    find: "if (refusals.length === 1) {",
    replace: "if (refusals.length >= 1) {",
  },
  {
    describes: "an adapter for a widget the Frame does not list is accepted",
    file: "packages/core/src/utils/internal/options/resolveAdapters.ts",
    find: "if (names.has(adapter.definition.name)) {",
    replace: "if (true) {",
  },
  {
    describes: "two widgets may share one native name",
    file: "packages/core/src/utils/internal/options/resolveFallbacks.ts",
    find: "if (names.has(definition.name)) {",
    replace: "if (false) {",
  },
  {
    describes: "a failed adapter answer is reported as indeterminate",
    file: "packages/core/src/utils/internal/widgets/mapSubmissionResult.ts",
    find: 'return { status: "failed", error: answer.error };',
    replace:
      'return { status: "indeterminate", reason: "provider-error", error: answer.error };',
  },
  {
    describes:
      "an adapter answer outside its contract is not named INVALID_ANSWER",
    file: "packages/core/src/utils/internal/widgets/getInvalidAnswer.ts",
    find: 'code: "INVALID_ANSWER",',
    replace: 'code: "PROVIDER_FAILED",',
  },
  {
    describes:
      "a handle of the old context is not replaced after a context change",
    file: "packages/react/src/hooks/useWidget.ts",
    find: "return useSyncExternalStore(widget.status.subscribe, getWidget, getWidget);",
    replace:
      "return useSyncExternalStore(widget.status.subscribe, () => widget, () => widget);",
  },
  {
    describes: "a hook outside a provider no longer says so",
    file: "packages/react/src/hooks/useFrame.ts",
    find: "if (frame === undefined) {",
    replace: "if (false) {",
  },
  {
    describes: "an expo widgets directory of nothing counts as a native side",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: 'if (sdk.widgetsDirectory === "") {',
    replace: "if (false) {",
  },
  {
    describes: "an expo widgets directory of null counts as an App Group",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: "if (sdk.widgetsDirectory === null) {",
    replace: "if (false) {",
  },
  {
    describes: "the expo reload request calls nothing",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: "widget.reload();",
    replace: "widget.getTimeline;",
  },
  {
    describes: "Voltra off Apple still opens",
    file: "packages/adapters/voltra-ios/src/voltraPayloadWidget.ts",
    find: "if (!available()) {",
    replace: "if (false) {",
  },
  {
    describes: "Android with no placed widget is submitted instead of skipped",
    file: "packages/adapters/android-widget/src/utils/publishToPlacements.ts",
    find: "if (placements.length === 0) {",
    replace: "if (false) {",
  },
  {
    describes: "Android swallows a rejected draw",
    file: "packages/adapters/android-widget/src/utils/publishToPlacements.ts",
    find: "throw rejection.reason;",
    replace: 'return { status: "submitted", evidence: "sdk-call-returned" };',
  },
  {
    describes: "Android ignores the application's availability answer",
    file: "packages/adapters/android-widget/src/androidWidget.ts",
    find: "if (!available()) {",
    replace: "if (false) {",
  },
  {
    describes: "a timeline instant past what a Date holds is accepted",
    file: "packages/core/src/utils/internal/validation/validateTimeline.ts",
    find: "if (Math.abs(entry.at) > MAX_INSTANT) {",
    replace: "if (false) {",
  },
  {
    describes: "a timeline whose first entry is in the future is accepted",
    file: "packages/core/src/utils/internal/validation/validateTimeline.ts",
    find: "if (first !== undefined && first.at > now) {",
    replace: "if (false) {",
  },
  {
    describes:
      "the entry a timeline shows is the first one, not the latest current one",
    file: "packages/core/src/utils/internal/validation/validateEntries.ts",
    find: "if (candidate.entry.at <= now) {",
    replace: "if (false) {",
  },
  {
    describes:
      "a request that replaced a forced one no longer sends equal content",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "const forced = this.#supersedeWaiting(request) || force || handedOver;",
    replace:
      "const forced = force || handedOver;\n    this.#supersedeWaiting(request);",
  },
  {
    describes: "a context ending leaves a request that never started unsettled",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "unstarted.cancel();\n        unstarted.settle(failure);",
    replace: "unstarted.cancel();",
  },
  {
    describes: "listeners are told in the middle of a step instead of after it",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "if (this.#depth > 0 || this.#flushing) {",
    replace: "if (this.#flushing) {",
  },
  {
    describes: "an adapter's late answer to open is used instead of released",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "this.#releaseOpening(opening);\n\n              return;",
    replace:
      "state.done = true;\n            cancelTimer();\n            resolve(opening);\n\n              return;",
  },
  {
    describes:
      "a provider that fails to release a session throws into the application",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "} catch {\n      this.#reportReleaseFailure();\n    }",
    replace: "} catch (error) {\n      throw error;\n    }",
  },
  {
    describes: "the issues of a changed value no longer name where it changed",
    file: "packages/core/src/utils/internal/validation/findChangedPaths.ts",
    find: "found.push(formatPath(path));",
    replace: 'found.push("");',
  },
  {
    describes: "every changed path is listed, however many",
    file: "packages/core/src/utils/internal/validation/findChangedPaths.ts",
    find: "if (found.length >= MAX_PATHS || before === after) {",
    replace: "if (before === after) {",
  },
  {
    describes: "a timeout past what a host timer holds is accepted",
    file: "packages/core/src/utils/internal/options/resolveTimeout.ts",
    find: " || timeout > MAX_TIMEOUT",
    replace: "",
  },
  {
    describes: "published diagnostics are no longer frozen",
    file: "packages/core/src/utils/internal/diagnostics/Diagnostics.ts",
    find: "this.#snapshot = deepFreeze(this.#getSnapshot());",
    replace: "this.#snapshot = this.#getSnapshot();",
  },
  {
    describes:
      "an unavailable adapter may call its provider without the suite noticing",
    file: "packages/core/src/testing/testWidgetAdapter.ts",
    find: 'harness.calls() === 0,\n        "An unavailable adapter called its provider.",',
    replace: 'true,\n        "An unavailable adapter called its provider.",',
  },
  {
    describes: "the React server snapshot of a status follows the client",
    file: "packages/react/src/hooks/useWidgetStatus.ts",
    find: "useObservableValue(widget.status, () => IDLE_STATUS)",
    replace: "useObservableValue(widget.status, widget.status.get)",
  },
  {
    describes: "disposing no longer cancels an adapter that is still opening",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "this.#cancelAsk?.();",
    replace: "",
  },
  {
    describes: "an adapter is opened after the Frame was disposed in a notice",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: 'if (this.#disposed) {\n          return { status: "disposed" };\n        }\n\n        const opening',
    replace: "const opening",
  },
  {
    describes: "a widget disposed in its ready notice is reported ready",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: 'if (this.#disposed) {\n      return { status: "disposed" };\n    }\n\n    return acquisition;',
    replace: "return acquisition;",
  },
  {
    describes:
      "a request is still registered after the schema ended its context",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "const validation = validate();\n\n    if (request.isSettled()) {",
    replace: "const validation = validate();\n\n    if (false) {",
  },
  {
    describes: "a schema that never answers holds its request for ever",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "    }, this.#timeout);\n\n    validation.then(",
    replace: "    }, Number.MAX_SAFE_INTEGER);\n\n    validation.then(",
  },
  {
    describes:
      "a schema that never answers a readback holds its request for ever",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "    }, this.#timeout);\n\n    readEntries(",
    replace: "    }, Number.MAX_SAFE_INTEGER);\n\n    readEntries(",
  },
  {
    describes:
      "a forced request still being validated no longer hands its force over",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "this.#supersedeWaiting(request) || force || handedOver;",
    replace: "this.#supersedeWaiting(request) || force;",
  },
  {
    describes: "a snapshot read inside a listener is older than the status",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "      this.#onAssign();\n",
    replace: "",
  },
  {
    describes: "a handle made after its adapter opened starts out idle",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "this.#statusStore.assign(this.#getStatus());",
    replace: "",
  },
  {
    describes: "the new context's reset is asked after the old handles ended",
    file: "packages/core/src/utils/Frame.ts",
    find: "const { retiring, next } = this.#swapContext();\n",
    replace:
      "const { retiring, next } = this.#swapContext();\n    this.#retire(retiring);\n",
  },
  {
    describes: "an error from another realm is not the provider's error",
    file: "packages/core/src/utils/internal/errors/isError.ts",
    find: 'Object.prototype.toString.call(thrown) === "[object Error]"',
    replace: "false",
  },
  {
    describes: "a fallback is shared with whoever made the definition",
    file: "packages/core/src/utils/internal/options/resolveFallbacks.ts",
    find: "snapshot: createSnapshot(captured.canonical),",
    replace: "snapshot: definition.fallback,",
  },
  {
    describes: "an adapter that answers nothing throws a TypeError",
    file: "packages/core/src/utils/internal/widgets/mapSubmissionResult.ts",
    find: 'if (answer === null || typeof answer !== "object") {',
    replace: "if (false) {",
  },
  {
    describes: "a key named like a prototype reads through to it",
    file: "packages/core/src/utils/internal/validation/findChangedPaths.ts",
    find: "Object.hasOwn(before, key) ? before[key] : undefined,",
    replace: "before[key],",
  },
  {
    describes: "a timeline entry is read again after it was checked",
    file: "packages/core/src/utils/internal/validation/copyTimeline.ts",
    find: "copy.push({ at: entry.at, data: entry.data });",
    replace: "copy.push(entry);",
  },
  {
    describes: "an adapter without a timeline passes the timeline check",
    file: "packages/core/src/testing/testWidgetAdapter.ts",
    find: 'if (session.publishTimeline === undefined) {\n        return "skipped";',
    replace: "if (session.publishTimeline === undefined) {\n        return;",
  },
  {
    describes: "a readback answered after its context ended is still parsed",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: 'if (this.#retired) {\n      this.#settleOperation(request, {\n        request: { id: request.id },\n        status: "expired",',
    replace:
      'if (false) {\n      this.#settleOperation(request, {\n        request: { id: request.id },\n        status: "expired",',
  },
  {
    describes: "a timeline entry that throws when read throws into the host",
    file: "packages/core/src/utils/internal/validation/copyTimeline.ts",
    find: '} catch (error) {\n    return {\n      status: "rejected",',
    replace:
      '} catch (error) {\n    throw error;\n    return {\n      status: "rejected",',
  },
  {
    describes:
      "an adapter is asked to open although the Frame was disposed meanwhile",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: 'if (state.done) {\n            throw new Error("The Frame was disposed.");',
    replace:
      'if (false) {\n            throw new Error("The Frame was disposed.");',
  },
  {
    describes: "a timeline the adapter lacks takes a waiting snapshot's place",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: 'replacement.kind === "timeline" &&\n      ready !== null &&',
    replace: "false &&\n      ready !== null &&",
  },
  {
    describes: "a readback answer outside its contract is not checked",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "const answer = checkReadbackAnswer(await readback.call(session));",
    replace: "const answer = await readback.call(session);",
  },
  {
    describes: "a schema that publishes again loses its request's force",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "const validation = validate();",
    replace:
      "this.#validating.delete(request.id);\n    const validation = validate();\n    this.#validating.set(request.id, { sequence: request.sequence, force });",
  },
  {
    describes: "a hand-made definition may carry a name no provider accepts",
    file: "packages/core/src/utils/internal/options/resolveFallbacks.ts",
    find: "if (!WIDGET_NAME_PATTERN.test(definition.name)) {",
    replace: "if (false) {",
  },
  {
    describes: "a hand-made definition may carry a fallback its schema refuses",
    file: "packages/core/src/utils/internal/options/resolveFallbacks.ts",
    find: 'if ("then" in validation || validation.status === "rejected") {',
    replace: "if (false) {",
  },
  {
    describes: "an outcome that cannot be frozen leaves its request pending",
    file: "packages/core/src/utils/internal/widgets/WidgetRequest.ts",
    find: "} catch {\n      this.#resolve(outcome);\n    }",
    replace: "} catch (error) {\n      throw error;\n    }",
  },
  {
    describes: "a readback answered after its deadline still runs the schema",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "stored: TimelineEntry<JsonRecord>[],\n  ) => {\n    if (request.isSettled()) {",
    replace: "stored: TimelineEntry<JsonRecord>[],\n  ) => {\n    if (false) {",
  },
  {
    describes: "preparing a Frame with no adapters asks nobody again",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "|| this.#adapters.length === 0",
    replace: "|| false",
  },
  {
    describes: "a context announces the epoch of whatever came after it",
    file: "packages/core/src/utils/Frame.ts",
    find: 'this.#diagnostics.emit(() => ({ type: "context-started", epoch, reset }));',
    replace:
      'this.#diagnostics.emit(() => ({ type: "context-started", epoch: this.#epoch, reset }));',
  },
  {
    describes: "a context is announced after the Frame was disposed",
    file: "packages/core/src/utils/Frame.ts",
    find: 'if (!this.#disposed) {\n      this.#diagnostics.emit(() => ({ type: "context-started"',
    replace:
      'if (true) {\n      this.#diagnostics.emit(() => ({ type: "context-started"',
  },
  {
    describes:
      "a write domain is announced blocked after the Frame was disposed",
    file: "packages/core/src/utils/internal/lanes/Lane.ts",
    find: "// Whoever heard the timeout may have disposed the Frame.\n    if (this.#disposed) {",
    replace:
      "// Whoever heard the timeout may have disposed the Frame.\n    if (false) {",
  },
  {
    describes: "a widget is told about its lane after the event that names it",
    file: "packages/core/src/utils/internal/lanes/Lane.ts",
    find: "this.#running = null;\n    this.#notify();\n    this.#report(running, ending);",
    replace:
      "this.#running = null;\n    this.#report(running, ending);\n    this.#notify();",
  },
  {
    describes:
      "a request is announced accepted after the one it replaced is settled",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: '    this.#announce(() => ({\n      type: "request-accepted",\n      widget: { key: this.#key },\n      request: { id: request.id },\n      revision,\n    }));\n\n    const forced = this.#supersedeWaiting(request) || force || handedOver;',
    replace:
      '    const forced = this.#supersedeWaiting(request) || force || handedOver;\n\n    this.#announce(() => ({\n      type: "request-accepted",\n      widget: { key: this.#key },\n      request: { id: request.id },\n      revision,\n    }));',
  },
  {
    describes:
      "an answer that cannot be printed throws instead of naming the contract",
    file: "packages/core/src/utils/internal/widgets/getInvalidAnswer.ts",
    find: "} catch {\n    // The answer is already known to be wrong; only its printing failed.\n  }",
    replace: "} catch (error) {\n    throw error;\n  }",
  },
  {
    describes:
      "a snapshot read while the Frame is disposing is older than the Frame",
    file: "packages/core/src/utils/Frame.ts",
    find: 'this.#diagnostics.drop();\n    this.#diagnostics.emit(() => ({ type: "frame-disposed" }));',
    replace: 'this.#diagnostics.emit(() => ({ type: "frame-disposed" }));',
  },
  {
    describes: "a clock that throws wedges whoever is observed",
    file: "packages/core/src/utils/internal/diagnostics/Diagnostics.ts",
    find: "} catch {\n      return;\n    }\n\n    this.#listeners.notify(",
    replace:
      "} catch (error) {\n      throw error;\n    }\n\n    this.#listeners.notify(",
  },
  {
    describes: "an advance made inside a timer callback rewinds the clock",
    file: "packages/core/src/mock/createTestClock.ts",
    find: "elapsed = Math.max(elapsed, until);",
    replace: "elapsed = until;",
  },
  {
    describes: "the expo adapter is no longer named expo",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: 'name: "expo",',
    replace: 'name: "expo-widgets",',
  },
  {
    describes:
      "an expo readback rejected with a non-Error is not made an Error",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: "error: toError(error),",
    replace: "error: error as Error,",
  },
  {
    describes: "an expo null check names the last null, not the first",
    file: "packages/adapters/expo/src/utils/findFirstNullPath.ts",
    find: "const [first] = Object.entries(value).flatMap(",
    replace: "const [first] = Object.entries(value).reverse().flatMap(",
  },
  {
    describes: "expo hands the SDK a wrapper instead of the render function",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: "sdk.createWidget(definition.name, render)",
    replace:
      "sdk.createWidget(definition.name, (props, environment) => render(props, environment))",
  },
  {
    describes: "an expo timeline call that throws is answered failed",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: "          widget.updateTimeline(\n            entries.map(({ at, data }) => ({\n              date: new Date(at),\n              props: data,\n            })),\n          );",
    replace:
      '          try {\n            widget.updateTimeline(\n              entries.map(({ at, data }) => ({\n                date: new Date(at),\n                props: data,\n              })),\n            );\n          } catch (error) {\n            return { status: "failed", error: toError(error) };\n          }',
  },
  {
    describes: "an expo reload call that throws is answered failed",
    file: "packages/adapters/expo/src/expoWidget.ts",
    find: '          widget.reload();\n\n          return { status: "submitted", evidence: "sdk-call-returned" };',
    replace:
      '          try {\n            widget.reload();\n          } catch (error) {\n            return { status: "failed", error: toError(error) };\n          }\n\n          return { status: "submitted", evidence: "sdk-call-returned" };',
  },
  {
    describes:
      "Android ends the call at the first rejected draw while others are in flight",
    file: "packages/adapters/android-widget/src/utils/publishToPlacements.ts",
    find: "await Promise.allSettled(",
    replace:
      "await ((p) => Promise.all(p).then(() => [], (reason) => [{ status: 'rejected', reason }]))(",
  },
  {
    describes: "Android reports a render that threw a non-Error as that value",
    file: "packages/adapters/android-widget/src/utils/attemptRender.ts",
    find: "error: new Error(RENDER_THREW_NON_ERROR_MESSAGE),",
    replace: "error: thrown as Error,",
  },
  {
    describes: "the React server status reads as busy instead of idle",
    file: "packages/react/src/hooks/useWidgetStatus.ts",
    find: 'work: "idle",\n  latest: null,',
    replace: 'work: "validating",\n  latest: null,',
  },
  {
    describes: "the React server status wants a value",
    file: "packages/react/src/hooks/useWidgetStatus.ts",
    find: 'desired: Object.freeze({ state: "absent" }),',
    replace:
      'desired: Object.freeze({ state: "accepted", origin: "publication", revision: 1 }),',
  },
  {
    describes: "the React server status is not frozen",
    file: "packages/react/src/hooks/useWidgetStatus.ts",
    find: "const IDLE_STATUS: WidgetStatus = Object.freeze({",
    replace: "const IDLE_STATUS: WidgetStatus = ({",
  },
  {
    describes: "the React server status lifecycle is not idle",
    file: "packages/react/src/hooks/useWidgetStatus.ts",
    find: 'lifecycle: Object.freeze({ state: "idle" }),',
    replace: 'lifecycle: Object.freeze({ state: "ready" }),',
  },
  {
    describes: "the system clock no longer reads the host's time",
    file: "packages/core/src/utils/internal/clock/createSystemClock.ts",
    find: "now: () => Date.now(),",
    replace: "now: () => 0,",
  },
  {
    describes: "the default timeout is no longer five seconds",
    file: "packages/core/src/utils/constants/defaults.ts",
    find: "DEFAULT_TIMEOUT = 5_000;",
    replace: "DEFAULT_TIMEOUT = 5_001;",
  },
  {
    describes: "the default limit of timeline entries is no longer 64",
    file: "packages/core/src/utils/constants/limits.ts",
    find: "entries: 64,",
    replace: "entries: 65,",
  },
  {
    describes: "a timeline of exactly the entries limit is refused",
    file: "packages/core/src/utils/internal/validation/validateTimeline.ts",
    find: "if (entries.length > limits.entries) {",
    replace: "if (entries.length >= limits.entries) {",
  },
  {
    describes: "an instant before the earliest a Date holds is accepted",
    file: "packages/core/src/utils/internal/validation/validateTimeline.ts",
    find: "Math.abs(entry.at) > MAX_INSTANT",
    replace: "entry.at > MAX_INSTANT",
  },
  {
    describes: "a timeline of exactly the byte limit is refused",
    file: "packages/core/src/utils/internal/validation/captureEntries.ts",
    find: "if (bytes > limits.bytes) {",
    replace: "if (bytes >= limits.bytes) {",
  },
  {
    describes:
      "an issue at the root of an entry no longer names the entry's data",
    file: "packages/core/src/utils/internal/validation/placeRejectionInEntry.ts",
    find: 'path === "" ? `entries[${index}].data`',
    replace: 'path === "" ? `entries[${index}]`',
  },
  {
    describes:
      "a schema answer that cannot travel is not refused as a changed value",
    file: "packages/core/src/utils/internal/validation/validateSnapshot.ts",
    find: 'if (captured.status === "rejected") {\n      return CHANGED_VALUE;',
    replace: "if (false) {\n      return CHANGED_VALUE;",
  },
  {
    describes: "a schema's issues are read as an array, not as any iterable",
    file: "packages/core/src/utils/internal/validation/validateSnapshot.ts",
    find: "issues: [...result.issues].map(",
    replace: "issues: result.issues.map(",
  },
  {
    describes: "an issue after a good array item is named by the wrong path",
    file: "packages/core/src/utils/internal/transport/SnapshotWalker.ts",
    find: '      parts.push(walked.text);\n      this.#path.pop();\n    }\n\n    this.#ancestors.delete(node);\n\n    return { status: "walked", text: `[',
    replace:
      '      parts.push(walked.text);\n    }\n\n    this.#ancestors.delete(node);\n\n    return { status: "walked", text: `[',
  },
  {
    describes: "a cycle through an array is not caught by name",
    file: "packages/core/src/utils/internal/transport/SnapshotWalker.ts",
    find: "    const rejection = this.#enter(node, depth);\n\n    if (rejection !== null) {\n      return rejection;\n    }\n\n    // A hole",
    replace: "    // A hole",
  },
  {
    describes: "the lowest high surrogate is counted as a three byte character",
    file: "packages/core/src/utils/internal/transport/getUtf8Length.ts",
    find: "unit >= 0xd800 && unit <= 0xdbff",
    replace: "unit > 0xd800 && unit <= 0xdbff",
  },
  {
    describes: "a fallback with keys out of order is refused",
    file: "packages/core/src/utils/widget.ts",
    find: "    captured.canonical,\n    DEFAULT_LIMITS,",
    replace: "    JSON.stringify(fallback),\n    DEFAULT_LIMITS,",
  },
  {
    describes: "an adapter with no name passes the conformance suite",
    file: "packages/core/src/testing/testWidgetAdapter.ts",
    find: 'typeof adapter.name === "string" && adapter.name !== "",',
    replace: "true,",
  },
  {
    describes: "a reload answered skipped fails the conformance suite",
    file: "packages/core/src/testing/testWidgetAdapter.ts",
    find: 'answer.status === "submitted" || answer.status === "skipped",',
    replace: 'answer.status === "submitted",',
  },
  {
    describes:
      "a context change with no options keeps the old account on screen",
    file: "packages/core/src/utils/Frame.ts",
    find: 'options?.reset ?? "fallback"',
    replace: 'options?.reset ?? "preserve"',
  },
  {
    describes: "a session opened as the Frame is disposed is never released",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: '          this.#releaseOpening(opening);\n\n          return { status: "disposed" };',
    replace: '          return { status: "disposed" };',
  },
  {
    describes: "a session whose asynchronous dispose rejects is left unhandled",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "Promise.resolve(session.dispose?.()).catch(this.#reportReleaseFailure);",
    replace: "session.dispose?.();",
  },
  {
    describes: "a schema that answers after its deadline still publishes",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "        this.#unstarted.delete(unstarted);\n\n        if (request.isSettled()) {\n          return;\n        }",
    replace: "        this.#unstarted.delete(unstarted);",
  },
  {
    describes: "an outcome that arrives after the context ended becomes latest",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: 'if (outcome.status !== "superseded" && !this.#retired) {',
    replace: 'if (outcome.status !== "superseded") {',
  },
  {
    describes:
      "a force that reached the provider is handed to the next request",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "    this.#validating.delete(request.id);\n    this.#submitting.add(request.id);",
    replace: "    this.#submitting.add(request.id);",
  },
  {
    describes:
      "a publication waiting behind a reload is no longer superseded by a newer one",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "    if (this.#waiting?.unstarted !== unstarted) {\n      return;\n    }\n\n    this.#waiting = null;",
    replace: "    this.#waiting = null;",
  },
  {
    describes: "a request the lane refused leaves its force to the next one",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "      onStop: (stop) => {\n        this.#started(unstarted);\n        this.#settlePublication(",
    replace: "      onStop: (stop) => {\n        this.#settlePublication(",
  },
  {
    describes: "a reload or readback asks an unavailable adapter again",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "acquire({ retry: false }).then((acquisition) =>\n        this.#step(() => {",
    replace:
      "acquire({ retry: true }).then((acquisition) =>\n        this.#step(() => {",
  },
  {
    describes: "a retired handle keeps listening to its write domain",
    file: "packages/core/src/utils/internal/widgets/WidgetRuntime.ts",
    find: "      this.#stopHost();\n      this.#stopLane?.();",
    replace: "      this.#stopHost();",
  },
  {
    describes:
      "a hung call that answers after the lane was disposed is announced",
    file: "packages/core/src/utils/internal/lanes/Lane.ts",
    find: "    if (this.#running !== running) {\n      return;\n    }\n\n    running.cancelTimer();",
    replace: "    running.cancelTimer();",
  },
  {
    describes: "queued writes reach the provider newest first",
    file: "packages/core/src/utils/internal/lanes/Lane.ts",
    find: "this.#queue.shift()",
    replace: "this.#queue.pop()",
  },
  {
    describes: "a stop handler that throws wedges the write domain",
    file: "packages/core/src/utils/internal/lanes/Lane.ts",
    find: "isolate(() => task.onStop(stop));",
    replace: "task.onStop(stop);",
  },
  {
    describes: "an asynchronous listener's rejection is left unhandled",
    file: "packages/core/src/utils/common/isolate.ts",
    find: "Promise.resolve(listener()).catch(rethrowLater);",
    replace: "listener();",
  },
  {
    describes: "a listener removed during a notification is still called",
    file: "packages/core/src/utils/common/Listeners.ts",
    find: "      if (!this.#entries.has(entry)) {\n        continue;\n      }\n\n",
    replace: "",
  },
  {
    describes:
      "disposing tells a status listener twice, once with a half changed status",
    file: "packages/core/src/utils/internal/widgets/WidgetHost.ts",
    find: "this.#lifecycle = DISPOSED_WIDGET_LIFECYCLE;",
    replace: "this.#set(DISPOSED_WIDGET_LIFECYCLE);",
  },
];

// vitest prints progress lines before the JSON report on some runs, so the
// report starts at the first brace of its own shape rather than at byte zero.
const countFailures = (text) => {
  const start = text.indexOf('{"numTotalTestSuites"');

  if (start === -1) {
    return -1;
  }

  try {
    return JSON.parse(text.slice(start)).numFailedTests ?? -1;
  } catch {
    return -1;
  }
};

const projectOf = (file) => {
  const adapter = /packages\/adapters\/([^/]+)\//.exec(file);

  if (adapter !== null) {
    return adapter[1];
  }

  return file.startsWith("packages/react/") ? "react" : "core";
};

const failingTests = (project) => {
  try {
    return countFailures(
      execFileSync(
        "node_modules/.bin/vitest",
        ["run", "--project", project, "--reporter", "json"],
        {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      ),
    );
  } catch (error) {
    // A non-zero exit is the normal case for a caught mutant, so the report on
    // stdout still decides. Only an unparseable report is a runner failure.
    return countFailures(`${error.stdout ?? ""}`);
  }
};

for (const project of new Set(MUTANTS.map(({ file }) => projectOf(file)))) {
  const baseline = failingTests(project);

  if (baseline !== 0) {
    console.error(
      `The ${project} baseline is not green (${baseline} failing). A mutation run against a red baseline proves nothing: fix the suite first.`,
    );
    process.exit(1);
  }
}

console.log("Baseline green. Running mutants.\n");

let caught = 0;
const survivors = [];

for (const mutant of MUTANTS) {
  const path = new URL(mutant.file, root);
  const original = readFileSync(path, "utf8");

  if (!original.includes(mutant.find)) {
    console.error(
      `Mutant is stale, its target text is gone: ${mutant.describes}`,
    );
    process.exit(1);
  }

  let failed = -1;

  try {
    writeFileSync(path, original.replace(mutant.find, mutant.replace));
    failed = failingTests(projectOf(mutant.file));
  } finally {
    writeFileSync(path, original);
  }

  if (failed === -1) {
    console.error(
      `The test run could not be read for: ${mutant.describes}. A mutant that does not compile proves nothing.`,
    );
    process.exit(1);
  }

  if (failed > 0) {
    caught += 1;
    console.log(`caught   ${mutant.describes}`);

    continue;
  }

  survivors.push(mutant.describes);
  console.log(`SURVIVED ${mutant.describes}`);
}

console.log(`\n${caught} of ${MUTANTS.length} mutants caught.`);

if (survivors.length > 0) {
  console.error("\nSurvivors, each either a missing test or dead code:");

  for (const survivor of survivors) {
    console.error(`  ${survivor}`);
  }

  process.exit(1);
}
