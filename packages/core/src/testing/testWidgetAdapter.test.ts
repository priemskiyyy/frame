import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { testWidgetAdapter } from "src/testing/testWidgetAdapter";
import type { WidgetAdapterHarness } from "src/testing/types/WidgetAdapterHarness";
import type { ReadbackAnswer } from "src/types/ReadbackAnswer";
import type { SubmissionResult } from "src/types/SubmissionResult";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetSession } from "src/types/WidgetSession";
import { streak } from "src/utils/Frame.fixture";

type Sabotage = {
  callsProviderWhenCreated?: boolean;
  callsProviderWhenUnavailable?: boolean;
  swallowsFailure?: boolean;
  sharesOneSession?: boolean;
  changesWriteDomain?: boolean;
  skipsEvidence?: boolean;
  complete?: boolean;
  name?: string;
  writeDomain?: string;
  opensUnavailableWith?: string;
  unavailableReason?: string;
  publishAnswers?: SubmissionResult[];
  timelineAnswer?: SubmissionResult;
  reloadAnswer?: SubmissionResult;
  readbackAnswer?: ReadbackAnswer;
};

const SUBMITTED: SubmissionResult = {
  status: "submitted",
  evidence: "sdk-call-returned",
};

const SKIPPED: SubmissionResult = {
  status: "skipped",
  reason: "no-placements",
};

const FAILED: SubmissionResult = { status: "failed", error: new Error("no") };

const createReference = (sabotage: Sabotage = {}) => {
  let calls = 0;
  let failing = false;
  let openings = 0;
  let disposals = 0;
  const publishAnswers = [...(sabotage.publishAnswers ?? [])];

  const call = () => {
    calls += 1;

    if (!failing) {
      return;
    }

    failing = false;

    throw new Error("provider failure");
  };

  const publish = (): SubmissionResult => {
    try {
      call();
    } catch (error) {
      if (sabotage.swallowsFailure === true) {
        return SUBMITTED;
      }

      throw error;
    }

    const scripted = publishAnswers.shift();

    if (scripted !== undefined) {
      return scripted;
    }

    if (sabotage.skipsEvidence === true) {
      // @ts-expect-error evidence is a closed set, and this adapter breaks it on purpose
      return { status: "submitted", evidence: "nothing" };
    }

    return SUBMITTED;
  };

  const createSession = (writeDomain: string): WidgetSession => {
    if (sabotage.complete !== true) {
      return { writeDomain, publish };
    }

    return {
      writeDomain,
      publish,
      publishTimeline: () => sabotage.timelineAnswer ?? SUBMITTED,
      reload: () => sabotage.reloadAnswer ?? SUBMITTED,
      readback: () =>
        sabotage.readbackAnswer ?? {
          status: "read",
          entries: [{ at: 1, data: { state: "empty" } }],
        },
      dispose: () => {
        disposals += 1;
      },
    };
  };

  const shared = createSession(
    sabotage.writeDomain ?? "reference:StreakWidget",
  );

  const create = (): WidgetAdapter => {
    if (sabotage.callsProviderWhenCreated === true) {
      call();
    }

    return {
      name: sabotage.name ?? "reference",
      definition: streak,
      open: () => {
        openings += 1;

        if (sabotage.opensUnavailableWith !== undefined) {
          return {
            status: "unavailable",
            reason: sabotage.opensUnavailableWith,
            remediation: null,
          };
        }

        if (sabotage.sharesOneSession === true) {
          return { status: "opened", session: shared };
        }

        if (sabotage.changesWriteDomain === true) {
          return {
            status: "opened",
            session: createSession(`reference:${openings}`),
          };
        }

        return {
          status: "opened",
          session: createSession(shared.writeDomain),
        };
      },
    };
  };

  const harness: WidgetAdapterHarness = {
    name: "reference",
    create,
    calls: () => calls,
    failNextCall: () => {
      failing = true;
    },
    createUnavailable: () => {
      calls = 0;

      return {
        name: "reference",
        definition: streak,
        open: () => {
          if (sabotage.callsProviderWhenUnavailable === true) {
            call();
          }

          return {
            status: "unavailable",
            reason: sabotage.unavailableReason ?? "No host.",
            remediation: null,
          };
        },
      };
    },
  };

  return { harness, disposals: () => disposals };
};

const expectFailure = async (sabotage: Sabotage, message: string) => {
  await expect(
    testWidgetAdapter(createReference(sabotage).harness),
  ).rejects.toThrowError(message);
};

test("an adapter that keeps the contract passes every check, and skips the ones for operations it does not have", async () => {
  const { passed, skipped } = await testWidgetAdapter(
    createReference().harness,
  );

  expect(skipped).toEqual([
    "a timeline is replaced whole, when the adapter has one",
    "a reload is acknowledged, when the adapter has one",
    "a readback answers entries with an instant each, when the adapter has one",
  ]);
  expect(passed).toHaveLength(8);
});

test("an adapter with every operation passes every check and skips none", async () => {
  const { passed, skipped } = await testWidgetAdapter(
    createReference({ complete: true }).harness,
  );

  expect(skipped).toEqual([]);
  expect(passed).toHaveLength(11);
});

test("a harness that cannot fail a call or make an unavailable adapter skips those two checks", async () => {
  const { adapter, control } = createMockAdapter(streak);

  const { skipped } = await testWidgetAdapter({
    name: "mock",
    create: () => adapter,
    calls: () => control.calls().length,
  });

  expect(skipped).toEqual([
    "a failing provider call is never answered submitted",
    "an unavailable adapter answers its reason without a provider call",
  ]);
});

test("the suite disposes the Frame it makes and the session it asks to dispose", async () => {
  const { harness, disposals } = createReference({ complete: true });

  await testWidgetAdapter(harness);

  expect(disposals()).toBe(2);
});

test("an adapter that calls its provider while being created fails", async () => {
  await expectFailure(
    { callsProviderWhenCreated: true },
    "called its provider while being created",
  );
});

test("an adapter with no name fails", async () => {
  await expectFailure({ name: "" }, "An adapter names itself");
});

test("an adapter that cannot open says why in a reason, and one without a reason fails", async () => {
  await expectFailure(
    { opensUnavailableWith: "" },
    "An unavailable adapter says why, in a reason.",
  );
  await expectFailure(
    { opensUnavailableWith: "No host." },
    "The adapter was expected to open, and answered unavailable.",
  );
});

test("a session with no write domain fails", async () => {
  await expectFailure({ writeDomain: "" }, "A session names its write domain.");
});

test("an unavailable adapter that calls its provider while opening fails", async () => {
  await expectFailure(
    { callsProviderWhenUnavailable: true },
    "An unavailable adapter called its provider.",
  );
});

test("an unavailable adapter with no reason fails", async () => {
  await expectFailure(
    { unavailableReason: "" },
    "The adapter was expected to answer unavailable with a reason.",
  );
});

test("an adapter that answers a failed call as submitted fails", async () => {
  await expectFailure({ swallowsFailure: true }, "never a success");
});

test("an adapter that hands out one session twice fails", async () => {
  await expectFailure({ sharesOneSession: true }, "a session of its own");
});

test("an adapter whose sessions use different write domains fails", async () => {
  await expectFailure({ changesWriteDomain: true }, "share one write domain");
});

test("a submission that names no known boundary fails", async () => {
  await expectFailure({ skipsEvidence: true }, "names the boundary it reached");
});

test("a valid snapshot that is not submitted fails", async () => {
  await expectFailure(
    { publishAnswers: [SKIPPED] },
    "A valid snapshot was answered skipped.",
  );
});

test("a Frame whose valid publication does not end submitted fails", async () => {
  await expectFailure(
    { publishAnswers: [SUBMITTED, SKIPPED] },
    "Frame ended a valid publication skipped.",
  );
});

test("a valid timeline that is not submitted fails", async () => {
  await expectFailure(
    { complete: true, timelineAnswer: FAILED },
    "A valid timeline was answered failed.",
  );
});

test("a reload that is neither submitted nor skipped fails, and a skipped one passes", async () => {
  await expectFailure(
    { complete: true, reloadAnswer: FAILED },
    "A reload request was answered failed.",
  );

  const { skipped } = await testWidgetAdapter(
    createReference({ complete: true, reloadAnswer: SKIPPED }).harness,
  );

  expect(skipped).toEqual([]);
});

test("a readback that does not answer read fails", async () => {
  await expectFailure(
    {
      complete: true,
      readbackAnswer: { status: "failed", error: new Error("no") },
    },
    "A readback was answered failed.",
  );
});

test("a readback entry without a whole-millisecond instant fails", async () => {
  await expectFailure(
    {
      complete: true,
      readbackAnswer: { status: "read", entries: [{ at: 1.5, data: {} }] },
    },
    "Every entry of a readback has an instant of epoch milliseconds.",
  );
});
