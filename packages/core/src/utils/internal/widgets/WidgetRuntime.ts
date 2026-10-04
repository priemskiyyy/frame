import type { Acquisition } from "src/types/internal/Acquisition";
import type { DiagnosticEventInput } from "src/types/internal/DiagnosticEventInput";
import type { LaneTask } from "src/types/internal/LaneTask";
import type { RequestStatus } from "src/types/internal/RequestStatus";
import type { Rejection } from "src/types/internal/Rejection";
import type { Replacement } from "src/types/internal/Replacement";
import type { Validation } from "src/types/internal/Validation";
import type { FrameClock } from "src/types/FrameClock";
import type { FrameLimits } from "src/types/FrameLimits";
import type { JsonRecord } from "src/types/JsonRecord";
import type { PublicationOutcome } from "src/types/PublicationOutcome";
import type { PublishOptions } from "src/types/PublishOptions";
import type { ReadbackOutcome } from "src/types/ReadbackOutcome";
import type { ReloadOutcome } from "src/types/ReloadOutcome";
import type { RequestFailure } from "src/types/RequestFailure";
import type { TimelineEntry } from "src/types/TimelineEntry";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import type { WidgetDesired } from "src/types/WidgetDesired";
import type { WidgetHandle } from "src/types/WidgetHandle";
import type { WidgetLifecycle } from "src/types/WidgetLifecycle";
import type { WidgetSession } from "src/types/WidgetSession";
import type { WidgetStatus } from "src/types/WidgetStatus";
import type { WidgetSummary } from "src/types/WidgetSummary";
import type { WidgetWork } from "src/types/WidgetWork";
import { ValueStore } from "src/utils/common/ValueStore";
import {
  ABSENT_WIDGET_DESIRED,
  IDLE_WIDGET_STATUS,
  RETIRED_WIDGET_LIFECYCLE,
} from "src/utils/constants/status";
import type { Lane } from "src/utils/internal/lanes/Lane";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { captureEntries } from "src/utils/internal/validation/captureEntries";
import { copyTimeline } from "src/utils/internal/validation/copyTimeline";
import { checkReadbackAnswer } from "src/utils/internal/widgets/checkReadbackAnswer";
import { getStopFailure } from "src/utils/internal/widgets/getStopFailure";
import { getUnsupportedFailure } from "src/utils/internal/widgets/getUnsupportedFailure";
import { mapSubmissionResult } from "src/utils/internal/widgets/mapSubmissionResult";
import { readEntries } from "src/utils/internal/widgets/readEntries";
import type { WidgetHost } from "src/utils/internal/widgets/WidgetHost";
import { WidgetRequest } from "src/utils/internal/widgets/WidgetRequest";
import { validateEntries } from "src/utils/internal/validation/validateEntries";
import { validateSnapshot } from "src/utils/internal/validation/validateSnapshot";
import { validateTimeline } from "src/utils/internal/validation/validateTimeline";

type Unstarted = {
  settle: (failure: RequestFailure) => void;
  cancel: () => void;
};

type Waiting = {
  request: WidgetRequest<PublicationOutcome>;
  force: boolean;
  unstarted: Unstarted;
};

type Session = WidgetSession;

export class WidgetRuntime {
  #key: string;
  #definition: WidgetDefinition;
  #host: WidgetHost;
  #fallback: Replacement & { kind: "snapshot" };
  #clock: FrameClock;
  #limits: FrameLimits;
  #nextRequest: () => number;
  #emit: (build: () => DiagnosticEventInput) => void;
  #onChange: () => void;
  #onAssign: () => void;
  #timeout: number;
  #data = new ValueStore<JsonRecord | null>(null);
  #statusStore = new ValueStore<WidgetStatus>(IDLE_WIDGET_STATUS);
  #desired: WidgetDesired = ABSENT_WIDGET_DESIRED;
  // Equal content keeps its snapshot, so a listener hears a change of content and never of object.
  #currentCanonical: string | null = null;
  #revision = 0;
  #newest: WidgetRequest<PublicationOutcome> | null = null;
  #validating = new Map<string, { sequence: number; force: boolean }>();
  #submitting = new Set<string>();
  #unstarted = new Set<Unstarted>();
  #waiting: Waiting | null = null;
  // Equal content is `unchanged` only against what was submitted for sure, never against what is merely wanted.
  #lastSubmitted: string | null = null;
  #latest: PublicationOutcome | null = null;
  #retired = false;
  #lane: Lane | null = null;
  #stopLane: (() => void) | null = null;
  #stopHost: () => void;
  #outbox: (() => void)[] = [];
  #depth = 0;
  #flushing = false;

  handle: WidgetHandle<JsonRecord>;

  constructor({
    key,
    definition,
    host,
    fallback,
    clock,
    timeout,
    limits,
    nextRequest,
    emit,
    onChange,
    onAssign,
  }: {
    key: string;
    definition: WidgetDefinition;
    host: WidgetHost;
    fallback: { snapshot: JsonRecord; canonical: string };
    clock: FrameClock;
    timeout: number;
    limits: FrameLimits;
    nextRequest: () => number;
    emit: (build: () => DiagnosticEventInput) => void;
    onChange: () => void;
    onAssign: () => void;
  }) {
    this.#key = key;
    this.#definition = definition;
    this.#host = host;
    this.#fallback = { kind: "snapshot", ...fallback };
    this.#clock = clock;
    this.#limits = limits;
    this.#nextRequest = nextRequest;
    this.#emit = emit;
    this.#onChange = onChange;
    this.#onAssign = onAssign;
    this.#timeout = timeout;

    this.handle = Object.freeze({
      get: this.#data.get,
      subscribe: this.#data.subscribe,
      status: this.#statusStore.observable,
      publish: this.publish,
      reset: this.reset,
      publishTimeline: this.publishTimeline,
      reload: this.reload,
      readback: this.readback,
    });

    this.#stopHost = host.subscribe(this.#handleHostChange);
    this.#followLane();

    // What is already true when a handle is made is not a change to announce.
    this.#statusStore.assign(this.#getStatus());
  }

  publish = (
    data: JsonRecord,
    options: PublishOptions = {},
  ): Promise<PublicationOutcome> =>
    this.#step(() => {
      const request = new WidgetRequest<PublicationOutcome>(
        this.#nextRequest(),
      );

      const refusal = this.#getRefusal();

      if (refusal !== null) {
        return this.#refusePublication(request, refusal);
      }

      const captured = captureSnapshot(data, this.#limits);

      if (captured.status === "rejected") {
        return this.#rejectPublication(request, captured);
      }

      const { canonical } = captured;

      this.#validate(
        request,
        options.force === true,
        () => validateSnapshot(this.#definition, canonical, this.#limits),
        (snapshot) =>
          this.#accept(request, {
            replacement: { kind: "snapshot", snapshot, canonical },
            origin: "publication",
            force: options.force === true,
          }),
      );

      return request.promise;
    });

  reset = (options: PublishOptions = {}): Promise<PublicationOutcome> =>
    this.#step(() => {
      const request = new WidgetRequest<PublicationOutcome>(
        this.#nextRequest(),
      );

      this.#accept(request, {
        replacement: this.#fallback,
        origin: "fallback",
        force: options.force === true,
      });

      return request.promise;
    });

  publishTimeline = (
    given: TimelineEntry<JsonRecord>[],
    options: PublishOptions = {},
  ): Promise<PublicationOutcome> =>
    this.#step(() => {
      const request = new WidgetRequest<PublicationOutcome>(
        this.#nextRequest(),
      );

      const copied = copyTimeline(given);
      const now = this.#clock.now();
      const refusal = this.#getRefusal();

      if (refusal !== null) {
        return this.#refusePublication(request, refusal);
      }

      if (copied.status === "rejected") {
        return this.#rejectPublication(request, copied);
      }

      const { entries } = copied;
      const invalid = validateTimeline(entries, { now, limits: this.#limits });

      if (invalid !== null) {
        return this.#rejectPublication(request, invalid);
      }

      const captured = captureEntries(entries, this.#limits);

      if (captured.status === "rejected") {
        return this.#rejectPublication(request, captured);
      }

      const { texts } = captured;

      const canonical = `[${texts
        .map(({ at, canonical: text }) => `{"at":${at},"data":${text}}`)
        .join(",")}]`;

      this.#validate(
        request,
        options.force === true,
        () =>
          validateEntries(this.#definition, texts, {
            limits: this.#limits,
            now,
          }),
        (validated) =>
          this.#accept(request, {
            replacement: { kind: "timeline", ...validated, canonical },
            origin: "publication",
            force: options.force === true,
          }),
      );

      return request.promise;
    });

  reload = (): Promise<ReloadOutcome> =>
    this.#step(() => {
      const request = new WidgetRequest<ReloadOutcome>(this.#nextRequest());

      this.#operate(request, {
        operation: "reload",
        select: (session) => {
          const { reload } = session;

          if (reload === undefined) {
            return null;
          }

          return async () => {
            this.#settleOperation(request, {
              request: { id: request.id },
              ...mapSubmissionResult(await reload.call(session)),
            });
          };
        },
        fail: (failure) =>
          this.#settleOperation(request, {
            request: { id: request.id },
            ...failure,
          }),
      });

      return request.promise;
    });

  readback = (): Promise<ReadbackOutcome<JsonRecord>> =>
    this.#step(() => {
      const request = new WidgetRequest<ReadbackOutcome<JsonRecord>>(
        this.#nextRequest(),
      );

      this.#operate(request, {
        operation: "readback",
        select: (session) => {
          const { readback } = session;

          if (readback === undefined) {
            return null;
          }

          return async () => {
            const answer = checkReadbackAnswer(await readback.call(session));

            if (answer.status === "failed") {
              this.#settleOperation(request, {
                request: { id: request.id },
                status: "failed",
                error: answer.error,
              });

              return;
            }

            this.#parse(request, answer.entries);
          };
        },
        fail: (failure) =>
          this.#settleOperation(request, {
            request: { id: request.id },
            ...failure,
          }),
      });

      return request.promise;
    });

  #parse = (
    request: WidgetRequest<ReadbackOutcome<JsonRecord>>,
    stored: TimelineEntry<JsonRecord>[],
  ) => {
    if (request.isSettled()) {
      return;
    }

    // What the provider stored belongs to a context that is over, and parsing it would hold a timer.
    if (this.#retired) {
      this.#settleOperation(request, {
        request: { id: request.id },
        status: "expired",
      });

      return;
    }

    const unstarted: Unstarted = {
      settle: (failure) =>
        this.#settleOperation(request, {
          request: { id: request.id },
          ...failure,
        }),
      cancel: () => {},
    };

    this.#unstarted.add(unstarted);

    unstarted.cancel = this.#clock.setTimer(() => {
      this.#step(() => {
        this.#unstarted.delete(unstarted);
        this.#settleOperation(request, {
          request: { id: request.id },
          status: "failed",
          error: new Error(
            `The schema did not answer within ${this.#timeout} ms.`,
          ),
        });
      });
    }, this.#timeout);

    readEntries(this.#definition, stored, this.#limits).then(
      ({ entries, rejected }) => {
        this.#step(() => {
          if (!this.#unstarted.delete(unstarted)) {
            return;
          }

          unstarted.cancel();
          this.#settleOperation(request, {
            request: { id: request.id },
            status: "read",
            entries,
            rejected,
          });
        });
      },
    );
  };

  retire = () => {
    this.#end({ status: "expired" });
  };

  dispose = () => {
    this.#end({ status: "disposed" });
  };

  summarize = (): WidgetSummary => {
    const { lifecycle, desired, work, latest } = this.#statusStore.get();

    return {
      name: this.#definition.name,
      adapter: this.#host.getReady()?.adapter ?? null,
      lifecycle: lifecycle.state,
      desired,
      work,
      latest: latest === null ? null : latest.status,
    };
  };

  // What listeners and diagnostics hear waits in the outbox until the outermost step is over.
  #step = <TResult>(change: () => TResult): TResult => {
    this.#depth += 1;

    try {
      return change();
    } finally {
      this.#depth -= 1;
      this.#flush();
    }
  };

  #later = (notify: (() => void) | null) => {
    if (notify === null) {
      return;
    }

    this.#outbox.push(notify);
  };

  #announce = (build: () => DiagnosticEventInput) => {
    this.#later(() => this.#emit(build));
  };

  // A listener that publishes starts a step of its own, and its notifications are picked up here in order.
  #flush = () => {
    if (this.#depth > 0 || this.#flushing) {
      return;
    }

    this.#flushing = true;

    for (
      let notify = this.#outbox.shift();
      notify !== undefined;
      notify = this.#outbox.shift()
    ) {
      notify();
    }

    this.#flushing = false;
  };

  #end = (failure: RequestFailure) => {
    this.#step(() => {
      this.#retired = true;
      this.#stopHost();
      this.#stopLane?.();

      for (const unstarted of [...this.#unstarted]) {
        this.#unstarted.delete(unstarted);
        unstarted.cancel();
        unstarted.settle(failure);
      }

      this.#desired = ABSENT_WIDGET_DESIRED;
      this.#latest = null;
      this.#later(this.#data.assign(null));
      this.#refresh();
    });
  };

  #getRefusal = (): RequestFailure | null => {
    if (this.#host.getLifecycle().state === "disposed") {
      return { status: "disposed" };
    }

    if (this.#retired) {
      return { status: "expired" };
    }

    return null;
  };

  #getLifecycle = (): WidgetLifecycle => {
    const lifecycle = this.#host.getLifecycle();

    if (lifecycle.state !== "disposed" && this.#retired) {
      return RETIRED_WIDGET_LIFECYCLE;
    }

    return lifecycle;
  };

  #getWork = (): WidgetWork => {
    if (this.#retired) {
      return "idle";
    }

    if (this.#lane?.isBlocked() === true) {
      return "blocked";
    }

    if (this.#submitting.size > 0) {
      return "submitting";
    }

    if (this.#validating.size > 0) {
      return "validating";
    }

    return "idle";
  };

  #handleHostChange = () => {
    this.#step(() => {
      this.#followLane();
      this.#refresh();
    });
  };

  #followLane = () => {
    const ready = this.#host.getReady();

    if (ready === null) {
      return;
    }

    this.#lane = ready.lane;
    this.#stopLane = ready.lane.subscribe(this.#refresh);
  };

  #getStatus = (): WidgetStatus => {
    const current = this.#statusStore.get();
    const lifecycle = this.#getLifecycle();
    const work = this.#getWork();

    if (
      current.lifecycle === lifecycle &&
      current.desired === this.#desired &&
      current.work === work &&
      current.latest === this.#latest
    ) {
      return current;
    }

    return Object.freeze({
      lifecycle,
      desired: this.#desired,
      work,
      latest: this.#latest,
    });
  };

  #refresh = () => {
    this.#step(() => {
      const next = this.#getStatus();

      if (next === this.#statusStore.get()) {
        return;
      }

      this.#later(this.#statusStore.assign(next));
      this.#onAssign();
      this.#later(this.#onChange);
    });
  };

  #validate = <TValue>(
    request: WidgetRequest<PublicationOutcome>,
    force: boolean,
    validate: () => Validation<TValue> | Promise<Validation<TValue>>,
    proceed: (value: TValue) => void,
  ) => {
    const refusal = this.#getRefusal();

    if (refusal !== null) {
      this.#refusePublication(request, refusal);

      return;
    }

    const unstarted: Unstarted = {
      settle: (failure) =>
        this.#settlePublication(
          request,
          { request: { id: request.id }, ...failure },
          null,
        ),
      cancel: () => {},
    };

    this.#validating.set(request.id, { sequence: request.sequence, force });
    this.#unstarted.add(unstarted);

    // Asked once the request is registered: the schema may publish again or end the context while it runs.
    const validation = validate();

    if (request.isSettled()) {
      return;
    }

    const judge = (validated: Validation<TValue>) => {
      this.#step(() => {
        this.#unstarted.delete(unstarted);

        if (request.isSettled()) {
          return;
        }

        if (validated.status === "rejected") {
          this.#rejectPublication(request, validated);

          return;
        }

        proceed(validated.snapshot);
      });
    };

    if (!("then" in validation)) {
      judge(validation);

      return;
    }

    this.#refresh();

    unstarted.cancel = this.#clock.setTimer(() => {
      this.#step(() => {
        this.#unstarted.delete(unstarted);
        this.#rejectPublication(request, {
          status: "rejected",
          reason: "schema-threw",
          issues: [
            {
              path: "",
              message: `The schema did not answer within ${this.#timeout} ms.`,
            },
          ],
        });
      });
    }, this.#timeout);

    validation.then((validated) => {
      unstarted.cancel();
      judge(validated);
    });
  };

  #settleOnce = <
    TOutcome extends { request: { id: string }; status: RequestStatus },
  >(
    request: WidgetRequest<TOutcome>,
    outcome: TOutcome,
  ) => {
    if (!request.settle(outcome)) {
      return false;
    }

    this.#validating.delete(request.id);
    this.#submitting.delete(request.id);
    this.#announce(() => ({
      type: "request-settled",
      widget: { key: this.#key },
      request: { id: request.id },
      outcome: { status: outcome.status },
    }));

    return true;
  };

  // `canonical` is what a `submitted` outcome submitted; anything else passes null.
  #settlePublication = (
    request: WidgetRequest<PublicationOutcome>,
    outcome: PublicationOutcome,
    canonical: string | null,
  ) => {
    this.#step(() => {
      if (!this.#settleOnce(request, outcome)) {
        return;
      }

      this.#learn(outcome, canonical);

      if (outcome.status !== "superseded" && !this.#retired) {
        this.#latest = outcome;
      }

      this.#refresh();
    });
  };

  #learn = (outcome: PublicationOutcome, canonical: string | null) => {
    if (outcome.status === "submitted") {
      this.#lastSubmitted = canonical;

      return;
    }

    if (outcome.status !== "indeterminate" && outcome.status !== "skipped") {
      return;
    }

    this.#lastSubmitted = null;
  };

  #settleOperation = <
    TOutcome extends { request: { id: string }; status: RequestStatus },
  >(
    request: WidgetRequest<TOutcome>,
    outcome: TOutcome,
  ) => {
    this.#step(() => {
      if (!this.#settleOnce(request, outcome)) {
        return;
      }

      this.#refresh();
    });
  };

  #refusePublication = (
    request: WidgetRequest<PublicationOutcome>,
    failure: RequestFailure,
  ) => {
    this.#settlePublication(
      request,
      { request: { id: request.id }, ...failure },
      null,
    );

    return request.promise;
  };

  #rejectPublication = (
    request: WidgetRequest<PublicationOutcome>,
    { reason, issues }: Rejection,
  ) => {
    this.#settlePublication(
      request,
      { request: { id: request.id }, status: "invalid", reason, issues },
      null,
    );

    return request.promise;
  };

  #accept = (
    request: WidgetRequest<PublicationOutcome>,
    {
      replacement,
      origin,
      force,
    }: {
      replacement: Replacement;
      origin: "fallback" | "publication";
      force: boolean;
    },
  ) => {
    const refusal = this.#getRefusal();

    if (refusal !== null) {
      this.#refusePublication(request, refusal);

      return;
    }

    const ready = this.#host.getReady();

    // A timeline the adapter cannot provide must not take a snapshot's place, so it answers unavailable at once.
    if (
      replacement.kind === "timeline" &&
      ready !== null &&
      ready.session.publishTimeline === undefined
    ) {
      this.#settlePublication(
        request,
        {
          request: { id: request.id },
          ...getUnsupportedFailure(ready.adapter, "publishTimeline"),
        },
        null,
      );

      return;
    }

    const newest = this.#newest;

    if (newest !== null && request.sequence < newest.sequence) {
      this.#settlePublication(
        request,
        {
          request: { id: request.id },
          status: "superseded",
          by: { id: newest.id },
        },
        null,
      );

      return;
    }

    // A forced request still validating when a newer one is accepted hands its force to it.
    const handedOver = [...this.#validating.values()].some(
      (validating) =>
        validating.force && validating.sequence < request.sequence,
    );

    this.#newest = request;
    this.#revision += 1;

    const revision = this.#revision;

    // Heard before the request it replaces is, so `superseded.by` was announced.
    this.#announce(() => ({
      type: "request-accepted",
      widget: { key: this.#key },
      request: { id: request.id },
      revision,
    }));

    const forced = this.#supersedeWaiting(request) || force || handedOver;

    this.#desired = Object.freeze({
      state: "accepted",
      origin,
      revision,
    });
    this.#show(replacement);
    this.#validating.delete(request.id);
    this.#submitting.add(request.id);
    this.#dispatch(request, replacement, revision, forced);
    this.#refresh();
  };

  // A timeline shows its latest entry that is not in the future, the moment the schedule lands.
  #show = (replacement: Replacement) => {
    const current =
      replacement.kind === "snapshot" ? replacement : replacement.current;

    if (current.canonical === this.#currentCanonical) {
      return;
    }

    this.#currentCanonical = current.canonical;
    this.#later(this.#data.assign(current.snapshot));
  };

  // Answers whether the request it took the place of was forced, because a force is about the widget, not one request.
  #supersedeWaiting = (by: WidgetRequest<PublicationOutcome>) => {
    const waiting = this.#waiting;

    if (waiting === null) {
      return false;
    }

    this.#waiting = null;
    this.#unstarted.delete(waiting.unstarted);
    waiting.unstarted.cancel();
    this.#settlePublication(
      waiting.request,
      {
        request: { id: waiting.request.id },
        status: "superseded",
        by: { id: by.id },
      },
      null,
    );

    return waiting.force;
  };

  #dispatch = (
    request: WidgetRequest<PublicationOutcome>,
    replacement: Replacement,
    revision: number,
    force: boolean,
  ) => {
    const unstarted: Unstarted = {
      settle: (failure) =>
        this.#settlePublication(
          request,
          { request: { id: request.id }, ...failure },
          null,
        ),
      cancel: () => {},
    };

    this.#waiting = { request, force, unstarted };
    this.#unstarted.add(unstarted);

    // Asked once what listeners were told is out, so a request is heard of before its adapter opens.
    this.#later(() => {
      this.#host.acquire({ retry: false }).then((acquisition) =>
        this.#step(() =>
          this.#enqueue(unstarted, request, acquisition, {
            replacement,
            revision,
            force,
          }),
        ),
      );
    });
  };

  #started = (unstarted: Unstarted) => {
    this.#unstarted.delete(unstarted);

    if (this.#waiting?.unstarted !== unstarted) {
      return;
    }

    this.#waiting = null;
  };

  #enqueue = (
    unstarted: Unstarted,
    request: WidgetRequest<PublicationOutcome>,
    acquisition: Acquisition,
    {
      replacement,
      revision,
      force,
    }: { replacement: Replacement; revision: number; force: boolean },
  ) => {
    // Superseded, retired or disposed while the adapter opened: already settled.
    if (!this.#unstarted.has(unstarted)) {
      return;
    }

    if (acquisition.status !== "ready") {
      this.#started(unstarted);
      this.#settlePublication(
        request,
        { request: { id: request.id }, ...acquisition },
        null,
      );

      return;
    }

    const call = this.#createCall(acquisition.session, replacement);

    if (call === null) {
      this.#started(unstarted);
      this.#settlePublication(
        request,
        {
          request: { id: request.id },
          ...getUnsupportedFailure(acquisition.adapter, "publishTimeline"),
        },
        null,
      );

      return;
    }

    const task: LaneTask = {
      start: async () => {
        this.#started(unstarted);

        if (!force && this.#lastSubmitted === replacement.canonical) {
          this.#settlePublication(
            request,
            { request: { id: request.id }, status: "unchanged", revision },
            null,
          );

          return;
        }

        const answer = mapSubmissionResult(await call());

        if (answer.status === "submitted") {
          this.#settlePublication(
            request,
            {
              request: { id: request.id },
              status: "submitted",
              kind: replacement.kind,
              revision,
              evidence: answer.evidence,
            },
            replacement.canonical,
          );

          return;
        }

        this.#settlePublication(
          request,
          { request: { id: request.id }, ...answer },
          null,
        );
      },
      onStop: (stop) => {
        this.#started(unstarted);
        this.#settlePublication(
          request,
          { request: { id: request.id }, ...getStopFailure(stop) },
          null,
        );
      },
    };

    unstarted.cancel = acquisition.lane.enqueue(task);
  };

  #createCall = (session: Session, replacement: Replacement) => {
    if (replacement.kind === "snapshot") {
      return () => session.publish(replacement.snapshot);
    }

    const { publishTimeline } = session;

    if (publishTimeline === undefined) {
      return null;
    }

    return () => publishTimeline.call(session, replacement.entries);
  };

  #operate = <
    TOutcome extends { request: { id: string }; status: RequestStatus },
  >(
    request: WidgetRequest<TOutcome>,
    {
      operation,
      select,
      fail,
    }: {
      operation: "reload" | "readback";
      select: (session: Session) => (() => Promise<void>) | null;
      fail: (failure: RequestFailure) => void;
    },
  ) => {
    const refusal = this.#getRefusal();

    if (refusal !== null) {
      fail(refusal);

      return;
    }

    const unstarted: Unstarted = { settle: fail, cancel: () => {} };

    this.#unstarted.add(unstarted);
    this.#submitting.add(request.id);
    this.#refresh();

    this.#later(() => {
      this.#host.acquire({ retry: false }).then((acquisition) =>
        this.#step(() => {
          if (!this.#unstarted.has(unstarted)) {
            return;
          }

          if (acquisition.status !== "ready") {
            this.#started(unstarted);
            fail(acquisition);

            return;
          }

          const call = select(acquisition.session);

          if (call === null) {
            this.#started(unstarted);
            fail(getUnsupportedFailure(acquisition.adapter, operation));

            return;
          }

          unstarted.cancel = acquisition.lane.enqueue({
            start: () => {
              this.#started(unstarted);

              return call();
            },
            onStop: (stop) => {
              this.#started(unstarted);
              fail(getStopFailure(stop));
            },
          });
        }),
      );
    });
  };
}
